package controllers

import (
	"slices"
	"testing"
)

func TestNormalizeRequestedLoginIDsDeduplicatesCaseInsensitive(t *testing.T) {
	t.Parallel()

	got := normalizeRequestedLoginIDs([]string{
		" S001 ",
		"s001",
		"",
		" STAFF@example.com ",
		"staff@example.com",
	})

	want := []string{"S001", "STAFF@example.com"}
	if !slices.Equal(got, want) {
		t.Fatalf("unexpected normalized login IDs: got %#v want %#v", got, want)
	}
}
