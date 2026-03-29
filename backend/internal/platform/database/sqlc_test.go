package database

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
)

func TestOpenReturnsDisabledWithoutDatabaseURL(t *testing.T) {
	t.Parallel()

	store, err := Open(context.Background(), "")
	if !errors.Is(err, ErrDisabled) {
		t.Fatalf("expected ErrDisabled, got %v", err)
	}
	if store != nil {
		t.Fatalf("expected nil store, got %#v", store)
	}
}

func TestExtractGooseUpSQL(t *testing.T) {
	t.Parallel()

	sql := `-- +goose Up
CREATE TABLE users (id text PRIMARY KEY);

-- +goose Down
DROP TABLE users;
`

	got, err := extractGooseUpSQL(sql)
	if err != nil {
		t.Fatalf("expected goose up SQL, got error: %v", err)
	}
	if strings.Contains(got, "DROP TABLE") {
		t.Fatalf("expected down section to be removed, got %q", got)
	}
	if !strings.Contains(got, "CREATE TABLE users") {
		t.Fatalf("expected up section to remain, got %q", got)
	}
}

func TestExtractGooseUpSQLErrorsWithoutMarker(t *testing.T) {
	t.Parallel()

	if _, err := extractGooseUpSQL("CREATE TABLE users (id text PRIMARY KEY);"); !errors.Is(err, ErrMissingGooseUpMarker) {
		t.Fatalf("expected ErrMissingGooseUpMarker, got %v", err)
	}
}

func TestParseRFC3339ReturnsErrorForInvalidInput(t *testing.T) {
	t.Parallel()

	if _, err := parseRFC3339("not-a-timestamp"); err == nil {
		t.Fatal("expected invalid timestamp to return an error")
	}
}

func TestHashPasswordHashesPlainInput(t *testing.T) {
	t.Parallel()

	hashed, err := hashPassword("password")
	if err != nil {
		t.Fatalf("expected hashPassword to succeed, got %v", err)
	}
	if hashed == "password" {
		t.Fatal("expected hashPassword to return a bcrypt hash")
	}
}

type fakeConfiguredUserConflictResolver struct {
	loginUsers map[string]dbgen.GetUserByLoginIDRow
	deletedIDs []string
	deleteErr  error
}

func (f *fakeConfiguredUserConflictResolver) GetUserByLoginID(_ context.Context, loginID string) (dbgen.GetUserByLoginIDRow, error) {
	row, ok := f.loginUsers[loginID]
	if !ok {
		return dbgen.GetUserByLoginIDRow{}, pgx.ErrNoRows
	}
	return row, nil
}

func (f *fakeConfiguredUserConflictResolver) DeleteUser(_ context.Context, id string) error {
	if f.deleteErr != nil {
		return f.deleteErr
	}
	f.deletedIDs = append(f.deletedIDs, id)
	return nil
}

func TestDeleteUsersConflictingWithConfiguredLoginIDsDeletesOldUserOnce(t *testing.T) {
	t.Parallel()

	resolver := &fakeConfiguredUserConflictResolver{
		loginUsers: map[string]dbgen.GetUserByLoginIDRow{
			"demo-circle-unverified@example.com": {ID: "member-0195ec00-0022-7000-8000-000000000001-unverified"},
			"legacy-alias@example.com":           {ID: "member-0195ec00-0022-7000-8000-000000000001-unverified"},
			"current@example.com":                {ID: "demo-circle-unverified"},
		},
	}

	err := deleteUsersConflictingWithConfiguredLoginIDs(context.Background(), resolver, config.User{
		ID:       "demo-circle-unverified",
		LoginIDs: []string{"demo-circle-unverified@example.com", "legacy-alias@example.com", "current@example.com"},
	})
	if err != nil {
		t.Fatalf("expected conflict cleanup to succeed, got %v", err)
	}
	if len(resolver.deletedIDs) != 1 || resolver.deletedIDs[0] != "member-0195ec00-0022-7000-8000-000000000001-unverified" {
		t.Fatalf("expected old configured user to be deleted once, got %#v", resolver.deletedIDs)
	}
}
