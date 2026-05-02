package database

import (
	"context"
	"slices"
	"testing"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/testutil/dbtest"
)

const (
	testCircleAID = "0195ec00-0021-7000-8000-000000000001"
	testCircleBID = "0195ec00-0022-7000-8000-000000000001"

	testPageID     = "0195ec00-0034-7000-8000-000000000001"
	testDocumentID = "0195ec00-0042-7000-8000-000000000001"
	testFormID     = "0195ec00-0014-7000-8000-000000000001"
	testPlaceID    = "0195ec00-0072-7000-8000-000000000001"
)

func TestListCirclePlaceNamesAndStaffCatalogWithPostgres(t *testing.T) {
	cfg := integrationConfig(t, false)
	store := openIntegrationStore(t, cfg)

	ctx := context.Background()
	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		t.Fatalf("seed integration data: %v", err)
	}

	rows, err := store.Queries().ListCirclePlaceNames(ctx, []string{testCircleBID})
	if err != nil {
		t.Fatalf("list circle place names: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected 2 place rows, got %#v", rows)
	}
	if rows[0].CircleID != testCircleBID || rows[0].Name != "1号館 101" {
		t.Fatalf("unexpected first place row: %#v", rows[0])
	}
	if rows[1].CircleID != testCircleBID || rows[1].Name != "中庭" {
		t.Fatalf("unexpected second place row: %#v", rows[1])
	}

	catalog := circle.NewSQLCCatalog(store.Queries())
	circles, err := catalog.ListForStaff()
	if err != nil {
		t.Fatalf("list staff circles via sqlc catalog: %v", err)
	}
	if len(circles) != 2 {
		t.Fatalf("expected 2 staff circles, got %#v", circles)
	}

	for _, currentCircle := range circles {
		switch currentCircle.ID {
		case testCircleAID:
			if len(currentCircle.Places) != 1 || currentCircle.Places[0] != "1号館 101" {
				t.Fatalf("unexpected circle A places: %#v", currentCircle.Places)
			}
		case testCircleBID:
			if len(currentCircle.Places) != 2 || currentCircle.Places[0] != "1号館 101" || currentCircle.Places[1] != "中庭" {
				t.Fatalf("unexpected circle B places: %#v", currentCircle.Places)
			}
		default:
			t.Fatalf("unexpected circle ID: %s", currentCircle.ID)
		}
	}
}

func TestEnsureSeedDataReseedsDemoContentWhenSyncEnabled(t *testing.T) {
	cfg := integrationConfig(t, true)
	store := openIntegrationStore(t, cfg)

	ctx := context.Background()
	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		t.Fatalf("seed integration data: %v", err)
	}

	deleteDemoContent(t, store, testCircleBID)
	assertDemoContentCount(t, store, testPageID, "pages", 0)
	assertDemoContentCount(t, store, testDocumentID, "documents", 0)
	assertDemoContentCount(t, store, testFormID, "forms", 0)
	assertBoothAssignmentCount(t, store, testPlaceID, testCircleBID, 0)

	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		t.Fatalf("reseed integration data: %v", err)
	}

	assertDemoContentCount(t, store, testPageID, "pages", 1)
	assertDemoContentCount(t, store, testDocumentID, "documents", 1)
	assertDemoContentCount(t, store, testFormID, "forms", 1)
	assertBoothAssignmentCount(t, store, testPlaceID, testCircleBID, 1)
}

func TestEnsureSeedDataDoesNotReseedDemoContentWhenSyncDisabled(t *testing.T) {
	cfg := integrationConfig(t, false)
	store := openIntegrationStore(t, cfg)

	ctx := context.Background()
	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		t.Fatalf("seed integration data: %v", err)
	}

	deleteDemoContent(t, store, testCircleBID)

	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		t.Fatalf("ensure seed data without sync: %v", err)
	}

	assertDemoContentCount(t, store, testPageID, "pages", 0)
	assertDemoContentCount(t, store, testDocumentID, "documents", 0)
	assertDemoContentCount(t, store, testFormID, "forms", 0)
	assertBoothAssignmentCount(t, store, testPlaceID, testCircleBID, 0)
}

func TestEnsureSeedDataSeedsDemoCircleProfileFields(t *testing.T) {
	cfg := integrationConfig(t, true)
	store := openIntegrationStore(t, cfg)

	ctx := context.Background()
	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		t.Fatalf("seed integration data: %v", err)
	}

	userRow, err := store.Queries().GetUserWithRelationsByID(ctx, "0195ec00-0054-7000-8000-000000000001")
	if err != nil {
		t.Fatalf("get demo-circle user: %v", err)
	}

	if userRow.LastName != "デモ" || userRow.LastNameReading != "でも" {
		t.Fatalf("expected seeded last name to use generic demo profile, got %#v", userRow)
	}
	if userRow.FirstName != "企画者" || userRow.FirstNameReading != "きかくしゃ" {
		t.Fatalf("expected seeded first name to match demo, got %#v", userRow)
	}
	if userRow.ContactEmail != "demo-circle@portaldots.com" {
		t.Fatalf("expected seeded contact email to match demo, got %q", userRow.ContactEmail)
	}
	if userRow.PhoneNumber != "090-0000-0003" {
		t.Fatalf("expected seeded phone number to match demo, got %q", userRow.PhoneNumber)
	}
	if !userRow.IsEmailVerified || !userRow.IsUnivemailVerified || !userRow.IsVerified {
		t.Fatalf("expected seeded verification flags to be true, got %#v", userRow)
	}
	gotLoginIDs := append([]string{}, userRow.LoginIds...)
	wantLoginIDs := []string{"DEMO-CIRCLE"}
	slices.Sort(gotLoginIDs)
	slices.Sort(wantLoginIDs)
	if !slices.Equal(gotLoginIDs, wantLoginIDs) {
		t.Fatalf("expected seeded login IDs to match demo, got %#v", userRow.LoginIds)
	}
}

func TestEnsureSeedDataSeedsDemoAdminProfileFields(t *testing.T) {
	cfg := integrationConfig(t, true)
	store := openIntegrationStore(t, cfg)

	ctx := context.Background()
	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		t.Fatalf("seed integration data: %v", err)
	}

	userRow, err := store.Queries().GetUserWithRelationsByID(ctx, "0195ec00-0051-7000-8000-000000000001")
	if err != nil {
		t.Fatalf("get demo-admin user: %v", err)
	}

	if userRow.LastName != "デモ" || userRow.LastNameReading != "でも" {
		t.Fatalf("expected seeded admin last name to use generic demo profile, got %#v", userRow)
	}
	if userRow.FirstName != "管理者" || userRow.FirstNameReading != "かんりしゃ" {
		t.Fatalf("expected seeded admin first name to match demo, got %#v", userRow)
	}
	if userRow.ContactEmail != "demo-admin@portaldots.com" {
		t.Fatalf("expected seeded admin contact email to match demo, got %q", userRow.ContactEmail)
	}
	if !slices.Equal(userRow.LoginIds, []string{"DEMO-ADMIN"}) {
		t.Fatalf("expected seeded admin login IDs to match demo, got %#v", userRow.LoginIds)
	}
}

func TestEnsureSeedDataListsUsersWithQueryOnUUIDColumn(t *testing.T) {
	cfg := integrationConfig(t, true)
	store := openIntegrationStore(t, cfg)

	ctx := context.Background()
	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		t.Fatalf("seed integration data: %v", err)
	}

	rows, err := store.Queries().ListUsersWithQuery(ctx, "")
	if err != nil {
		t.Fatalf("list users with empty query: %v", err)
	}
	if len(rows) != 5 {
		t.Fatalf("expected 5 demo users from query, got %d", len(rows))
	}

	rows, err = store.Queries().ListUsersWithQuery(ctx, "0195ec00-0051")
	if err != nil {
		t.Fatalf("list users with partial uuid query: %v", err)
	}
	if len(rows) != 1 || rows[0].ID != "0195ec00-0051-7000-8000-000000000001" {
		t.Fatalf("expected demo-admin to match UUID query, got %#v", rows)
	}
}

func TestUserQueriesReturnActualUpdatedAt(t *testing.T) {
	cfg := integrationConfig(t, true)
	store := openIntegrationStore(t, cfg)

	ctx := context.Background()
	if err := EnsureSeedData(ctx, store, cfg); err != nil {
		t.Fatalf("seed integration data: %v", err)
	}

	userID := "0195ec00-0051-7000-8000-000000000001"
	wantUpdatedAt := time.Date(2026, time.March, 10, 9, 30, 0, 0, time.UTC)
	if _, err := store.Pool().Exec(ctx, `UPDATE users SET updated_at = $2 WHERE id = $1`, userID, wantUpdatedAt); err != nil {
		t.Fatalf("update user updated_at: %v", err)
	}

	detail, err := store.Queries().GetUserWithRelationsByID(ctx, userID)
	if err != nil {
		t.Fatalf("get user with relations by id: %v", err)
	}
	if !detail.UpdatedAt.Time.Equal(wantUpdatedAt) {
		t.Fatalf("expected detail updatedAt %s, got %s", wantUpdatedAt, detail.UpdatedAt.Time)
	}

	rows, err := store.Queries().ListUsersWithQuery(ctx, userID)
	if err != nil {
		t.Fatalf("list users with query: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("expected 1 queried user, got %#v", rows)
	}
	if !rows[0].UpdatedAt.Time.Equal(wantUpdatedAt) {
		t.Fatalf("expected list updatedAt %s, got %s", wantUpdatedAt, rows[0].UpdatedAt.Time)
	}
}

func integrationConfig(t *testing.T, syncAuthUserOnStartup bool) config.Config {
	t.Helper()

	t.Setenv("PORTALDOTS_ALLOW_DANGEROUSLY", "true")
	if syncAuthUserOnStartup {
		t.Setenv("PORTALDOTS_SYNC_AUTH_USER_ON_STARTUP", "true")
	} else {
		t.Setenv("PORTALDOTS_SYNC_AUTH_USER_ON_STARTUP", "false")
	}

	cfg := config.FromEnv()
	cfg.DatabaseURL = dbtest.RequireDatabaseURL(t)
	cfg.MigrationsDir = dbtest.MigrationsDir(t)

	return cfg
}

func openIntegrationStore(t *testing.T, cfg config.Config) *SQLCStore {
	t.Helper()

	lockPool := dbtest.OpenLockedPool(t, cfg.DatabaseURL)
	dbtest.ResetPublicSchema(t, lockPool)

	store, err := Open(context.Background(), cfg.DatabaseURL)
	if err != nil {
		t.Fatalf("open sqlc store: %v", err)
	}
	t.Cleanup(store.Close)

	if err := Migrate(context.Background(), store.Pool(), cfg.MigrationsDir); err != nil {
		t.Fatalf("migrate integration database: %v", err)
	}

	return store
}

func deleteDemoContent(t *testing.T, store *SQLCStore, circleID string) {
	t.Helper()

	ctx := context.Background()
	if _, err := store.Pool().Exec(ctx, `DELETE FROM pages WHERE id = $1`, testPageID); err != nil {
		t.Fatalf("delete demo page: %v", err)
	}
	if _, err := store.Pool().Exec(ctx, `DELETE FROM documents WHERE id = $1`, testDocumentID); err != nil {
		t.Fatalf("delete demo document: %v", err)
	}
	if _, err := store.Pool().Exec(ctx, `DELETE FROM forms WHERE id = $1`, testFormID); err != nil {
		t.Fatalf("delete demo form: %v", err)
	}
	if _, err := store.Pool().Exec(ctx, `DELETE FROM booths WHERE place_id = $1 AND circle_id = $2`, testPlaceID, circleID); err != nil {
		t.Fatalf("delete demo booth assignment: %v", err)
	}
}

func assertDemoContentCount(t *testing.T, store *SQLCStore, id string, table string, want int) {
	t.Helper()

	var got int
	if err := store.Pool().QueryRow(context.Background(), `SELECT COUNT(*) FROM `+table+` WHERE id = $1`, id).Scan(&got); err != nil {
		t.Fatalf("count %s row %s: %v", table, id, err)
	}
	if got != want {
		t.Fatalf("expected %d rows in %s for %s, got %d", want, table, id, got)
	}
}

func assertBoothAssignmentCount(t *testing.T, store *SQLCStore, placeID string, circleID string, want int) {
	t.Helper()

	var got int
	if err := store.Pool().QueryRow(
		context.Background(),
		`SELECT COUNT(*) FROM booths WHERE place_id = $1 AND circle_id = $2`,
		placeID,
		circleID,
	).Scan(&got); err != nil {
		t.Fatalf("count booth assignment %s/%s: %v", placeID, circleID, err)
	}
	if got != want {
		t.Fatalf("expected %d booth rows for %s/%s, got %d", want, placeID, circleID, got)
	}
}
