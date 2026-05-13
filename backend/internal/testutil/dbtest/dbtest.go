package dbtest

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const integrationLockKey = 91059

func RequireDatabaseURL(t testing.TB) string {
	t.Helper()

	databaseURL := strings.TrimSpace(os.Getenv("PORTAL_DATABASE_URL"))
	if databaseURL == "" {
		t.Skip("integration tests require PORTAL_DATABASE_URL")
	}

	return databaseURL
}

func MigrationsDir(t testing.TB) string {
	t.Helper()

	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve dbtest source path")
	}

	return filepath.Join(filepath.Dir(file), "..", "..", "..", "db", "migrations")
}

func OpenLockedPool(t testing.TB, databaseURL string) *pgxpool.Pool {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("open postgres pool: %v", err)
	}
	t.Cleanup(pool.Close)

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("ping postgres: %v", err)
	}

	lockConn, err := pool.Acquire(ctx)
	if err != nil {
		t.Fatalf("acquire postgres lock connection: %v", err)
	}
	t.Cleanup(func() {
		unlockCtx, unlockCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer unlockCancel()

		if _, err := lockConn.Exec(unlockCtx, `SELECT pg_advisory_unlock($1)`, integrationLockKey); err != nil {
			t.Fatalf("unlock postgres integration lock: %v", err)
		}
		lockConn.Release()
	})

	if _, err := lockConn.Exec(ctx, `SELECT pg_advisory_lock($1)`, integrationLockKey); err != nil {
		t.Fatalf("lock postgres integration tests: %v", err)
	}

	return pool
}

func ResetPublicSchema(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if _, err := pool.Exec(ctx, `DROP SCHEMA IF EXISTS public CASCADE`); err != nil {
		t.Fatalf("drop public schema: %v", err)
	}
	if _, err := pool.Exec(ctx, `CREATE SCHEMA public`); err != nil {
		t.Fatalf("create public schema: %v", err)
	}
}
