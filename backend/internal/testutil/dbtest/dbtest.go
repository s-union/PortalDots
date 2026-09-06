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

	initCtx, initCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer initCancel()

	pool, err := pgxpool.New(initCtx, databaseURL)
	if err != nil {
		t.Fatalf("open postgres pool: %v", err)
	}
	t.Cleanup(pool.Close)

	if err := pool.Ping(initCtx); err != nil {
		t.Fatalf("ping postgres: %v", err)
	}

	lockConn, err := pool.Acquire(initCtx)
	if err != nil {
		t.Fatalf("acquire postgres lock connection: %v", err)
	}

	lockCtx, lockCancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer lockCancel()

	if _, err := lockConn.Exec(lockCtx, `SELECT pg_advisory_lock($1)`, integrationLockKey); err != nil {
		lockConn.Release()
		t.Fatalf("lock postgres integration tests: %v", err)
	}

	t.Cleanup(func() {
		defer lockConn.Release()
		unlockCtx, unlockCancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer unlockCancel()

		if _, err := lockConn.Exec(unlockCtx, `SELECT pg_advisory_unlock($1)`, integrationLockKey); err != nil {
			t.Errorf("unlock postgres integration lock: %v", err)
		}
	})

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
