package tag

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/testutil/dbtest"
)

// TestSQLCRepositoryUpdatePreservesColorWhenOmitted verifies the atomic SQL
// path: an update that omits colour must not touch the colour column, so a
// concurrent or interleaved update can never roll the stored colour back.
func TestSQLCRepositoryUpdatePreservesColorWhenOmitted(t *testing.T) {
	databaseURL := dbtest.RequireDatabaseURL(t)
	lockPool := dbtest.OpenLockedPool(t, databaseURL)
	dbtest.ResetPublicSchema(t, lockPool)

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		t.Fatalf("open postgres pool: %v", err)
	}
	t.Cleanup(pool.Close)

	applyTagMigrations(t, pool, dbtest.MigrationsDir(t))

	repo := NewSQLCRepository(dbgen.New(pool))
	created, err := repo.Create("タグ", "red")
	if err != nil {
		t.Fatalf("create tag: %v", err)
	}

	updated, err := repo.Update(created.ID, "タグ", nil)
	if err != nil {
		t.Fatalf("update without color: %v", err)
	}
	if updated.Color != "red" {
		t.Fatalf("update without color changed colour to %q, want red", updated.Color)
	}

	updated, err = repo.Update(created.ID, "タグ", ptr("blue"))
	if err != nil {
		t.Fatalf("update with color: %v", err)
	}
	if updated.Color != "blue" {
		t.Fatalf("update with color kept %q, want blue", updated.Color)
	}

	updated, err = repo.Update(created.ID, "タグ", nil)
	if err != nil {
		t.Fatalf("second update without color: %v", err)
	}
	if updated.Color != "blue" {
		t.Fatalf("second update without color rolled back to %q, want blue", updated.Color)
	}
}

// applyTagMigrations mirrors platform/database.Migrate, which cannot be
// imported here: platform/database depends on this package, so the import
// would form a cycle. The schema is freshly reset per test, so migration
// tracking is unnecessary.
func applyTagMigrations(t *testing.T, pool *pgxpool.Pool, dir string) {
	t.Helper()

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read migrations directory: %v", err)
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		names = append(names, entry.Name())
	}
	sort.Strings(names)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	for _, name := range names {
		contents, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatalf("read migration %s: %v", name, err)
		}
		statement := tagGooseUpStatement(t, name, string(contents))
		if statement == "" {
			continue
		}
		if _, err := pool.Exec(ctx, statement); err != nil {
			t.Fatalf("apply migration %s: %v", name, err)
		}
	}
}

func tagGooseUpStatement(t *testing.T, name, contents string) string {
	t.Helper()

	const upMarker = "-- +goose Up"
	index := strings.Index(contents, upMarker)
	if index < 0 {
		t.Fatalf("migration %s: missing goose up marker", name)
	}

	statement := contents[index+len(upMarker):]
	if newline := strings.Index(statement, "\n"); newline >= 0 {
		statement = statement[newline+1:]
	}
	if down := strings.Index(statement, "-- +goose Down"); down >= 0 {
		statement = statement[:down]
	}

	return strings.TrimSpace(statement)
}
