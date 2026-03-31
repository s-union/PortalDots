package database

import (
	"context"
	"errors"
	"strings"
	"time"

	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"

	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrDisabled = errors.New("database is disabled")

type SQLCStore struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
}

func Open(ctx context.Context, databaseURL string) (*SQLCStore, error) {
	if strings.TrimSpace(databaseURL) == "" {
		return nil, ErrDisabled
	}

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, err
	}

	return &SQLCStore{
		pool:    pool,
		queries: dbgen.New(pool),
	}, nil
}

func (s *SQLCStore) Close() {
	if s == nil || s.pool == nil {
		return
	}

	s.pool.Close()
}

func (s *SQLCStore) Pool() *pgxpool.Pool {
	return s.pool
}

func (s *SQLCStore) Queries() *dbgen.Queries {
	return s.queries
}

func (s *SQLCStore) CountUsers(ctx context.Context) (int64, error) {
	return s.queries.CountUsers(ctx)
}
