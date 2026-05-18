package pgutil_test

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

func TestFormatTimestamptz(t *testing.T) {
	t.Run("valid timestamp is formatted as RFC3339 UTC", func(t *testing.T) {
		ts := time.Date(2026, 3, 15, 9, 30, 0, 0, time.FixedZone("JST", 9*60*60))
		input := pgtype.Timestamptz{Time: ts, Valid: true}
		got := pgutil.FormatTimestamptz(input)
		want := "2026-03-15T00:30:00Z"
		if got != want {
			t.Errorf("FormatTimestamptz() = %q, want %q", got, want)
		}
	})

	t.Run("invalid timestamp returns empty string", func(t *testing.T) {
		input := pgtype.Timestamptz{Valid: false}
		got := pgutil.FormatTimestamptz(input)
		if got != "" {
			t.Errorf("FormatTimestamptz(invalid) = %q, want empty string", got)
		}
	})
}

func TestText(t *testing.T) {
	t.Run("non-empty string returns valid pgtype.Text", func(t *testing.T) {
		got := pgutil.Text("hello")
		if !got.Valid {
			t.Error("Text(\"hello\").Valid = false, want true")
		}
		if got.String != "hello" {
			t.Errorf("Text(\"hello\").String = %q, want %q", got.String, "hello")
		}
	})

	t.Run("empty string returns invalid pgtype.Text", func(t *testing.T) {
		got := pgutil.Text("")
		if got.Valid {
			t.Error("Text(\"\").Valid = true, want false")
		}
	})
}

func TestTimestamptz(t *testing.T) {
	t.Run("non-zero time returns valid pgtype.Timestamptz", func(t *testing.T) {
		ts := time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC)
		got := pgutil.Timestamptz(ts)
		if !got.Valid {
			t.Error("Timestamptz(non-zero).Valid = false, want true")
		}
		if !got.Time.Equal(ts) {
			t.Errorf("Timestamptz(non-zero).Time = %v, want %v", got.Time, ts)
		}
	})

	t.Run("zero time returns invalid pgtype.Timestamptz", func(t *testing.T) {
		got := pgutil.Timestamptz(time.Time{})
		if got.Valid {
			t.Error("Timestamptz(zero).Valid = true, want false")
		}
	})
}

func TestInt4ToPtr(t *testing.T) {
	t.Run("valid Int4 returns pointer to its value", func(t *testing.T) {
		input := pgtype.Int4{Int32: 42, Valid: true}
		got := pgutil.Int4ToPtr(input)
		if got == nil {
			t.Fatal("Int4ToPtr(valid) = nil, want non-nil pointer")
		}
		if *got != 42 {
			t.Errorf("*Int4ToPtr(valid) = %d, want 42", *got)
		}
	})

	t.Run("invalid Int4 returns nil", func(t *testing.T) {
		input := pgtype.Int4{Valid: false}
		got := pgutil.Int4ToPtr(input)
		if got != nil {
			t.Errorf("Int4ToPtr(invalid) = %v, want nil", got)
		}
	})
}
