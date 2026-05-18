package pgutil

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func FormatTimestamptz(value pgtype.Timestamptz) string {
	if !value.Valid {
		return ""
	}

	return value.Time.UTC().Format(time.RFC3339)
}

func Text(value string) pgtype.Text {
	if value == "" {
		return pgtype.Text{}
	}

	return pgtype.Text{
		String: value,
		Valid:  true,
	}
}

func Timestamptz(value time.Time) pgtype.Timestamptz {
	if value.IsZero() {
		return pgtype.Timestamptz{}
	}

	return pgtype.Timestamptz{
		Time:  value,
		Valid: true,
	}
}

func Int4ToPtr(value pgtype.Int4) *int32 {
	if !value.Valid {
		return nil
	}

	result := value.Int32
	return &result
}

func OptionalString(value string) *string {
	if value == "" {
		return nil
	}
	s := value
	return &s
}

func DerefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
