package database

import (
	"context"
	"errors"
	"strings"
	"testing"
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
