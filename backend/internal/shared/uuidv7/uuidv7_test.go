package uuidv7

import (
	"testing"

	"github.com/google/uuid"
)

func TestNewStringProducesUUIDv7(t *testing.T) {
	t.Parallel()

	value, err := NewString()
	if err != nil {
		t.Fatalf("NewString returned error: %v", err)
	}
	if err := uuid.Validate(value); err != nil {
		t.Fatalf("NewString returned invalid uuid %q: %v", value, err)
	}

	parsed, err := uuid.Parse(value)
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	if parsed.Version() != 7 {
		t.Fatalf("expected version 7 uuid, got %q", value)
	}
}
