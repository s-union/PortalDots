package database

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	gooseUpMarker   = "-- +goose Up"
	gooseDownMarker = "-- +goose Down"
)

var ErrMissingGooseUpMarker = errors.New("missing goose up marker")

func Migrate(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	if pool == nil {
		return fmt.Errorf("migration pool is nil")
	}
	if strings.TrimSpace(dir) == "" {
		return fmt.Errorf("migrations directory is required")
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read migrations directory: %w", err)
	}

	paths := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		paths = append(paths, filepath.Join(dir, entry.Name()))
	}
	sort.Strings(paths)

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin migration transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(873421, 1)`); err != nil {
		return fmt.Errorf("acquire migration advisory lock: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`); err != nil {
		return fmt.Errorf("ensure schema_migrations table: %w", err)
	}

	applied, err := loadAppliedMigrations(ctx, tx)
	if err != nil {
		return err
	}

	for _, path := range paths {
		filename := filepath.Base(path)
		if _, ok := applied[filename]; ok {
			continue
		}

		contents, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", path, err)
		}

		statement, err := extractGooseUpSQL(string(contents))
		if err != nil {
			return fmt.Errorf("parse migration %s: %w", path, err)
		}
		if strings.TrimSpace(statement) == "" {
			applied[filename] = struct{}{}
			continue
		}

		if _, err := tx.Exec(ctx, statement); err != nil {
			return fmt.Errorf("apply migration %s: %w", path, err)
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO schema_migrations (filename)
			VALUES ($1)
		`, filename); err != nil {
			return fmt.Errorf("record migration %s: %w", path, err)
		}
		applied[filename] = struct{}{}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit migrations: %w", err)
	}

	return nil
}

func loadAppliedMigrations(ctx context.Context, tx pgx.Tx) (map[string]struct{}, error) {
	rows, err := tx.Query(ctx, `SELECT filename FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("list applied migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]struct{})
	for rows.Next() {
		var filename string
		if err := rows.Scan(&filename); err != nil {
			return nil, fmt.Errorf("scan applied migration: %w", err)
		}
		applied[filename] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate applied migrations: %w", err)
	}

	return applied, nil
}

func extractGooseUpSQL(contents string) (string, error) {
	upIndex := strings.Index(contents, gooseUpMarker)
	if upIndex < 0 {
		return "", ErrMissingGooseUpMarker
	}

	start := upIndex + len(gooseUpMarker)
	if newlineIndex := strings.Index(contents[start:], "\n"); newlineIndex >= 0 {
		start += newlineIndex + 1
	}

	trimmed := contents[start:]
	if downIndex := strings.Index(trimmed, gooseDownMarker); downIndex >= 0 {
		trimmed = trimmed[:downIndex]
	}

	return strings.TrimSpace(trimmed), nil
}
