package tag

import "testing"

func TestNormalizeColor(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", "gray"},
		{"gray", "gray"},
		{" RED ", "red"},
		{"Blue", "blue"},
	}
	for _, tc := range tests {
		if got := NormalizeColor(tc.in); got != tc.want {
			t.Fatalf("NormalizeColor(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestIsValidColor(t *testing.T) {
	for _, color := range []string{"gray", "red", "orange", "green", "blue", "purple", "RED"} {
		if !IsValidColor(color) {
			t.Fatalf("IsValidColor(%q) = false, want true", color)
		}
	}
	for _, color := range []string{"", "  ", "teal", "neon", "#ff0000", "reddish"} {
		if IsValidColor(color) {
			t.Fatalf("IsValidColor(%q) = true, want false", color)
		}
	}
}

func TestMemoryRepositoryUpdatePreservesColorWhenOmitted(t *testing.T) {
	repo := NewMemoryRepository(nil)
	created, err := repo.Create("タグ", "red")
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	// A nil color must leave the stored colour untouched, mirroring the SQL
	// COALESCE($color, color) path so concurrent updates never roll back.
	updated, err := repo.Update(created.ID, "タグ", nil)
	if err != nil {
		t.Fatalf("update without color: %v", err)
	}
	if updated.Color != "red" {
		t.Fatalf("update without color changed colour to %q, want red", updated.Color)
	}

	updated, err = repo.Update(created.ID, "タグ", ptr("BLUE"))
	if err != nil {
		t.Fatalf("update with color: %v", err)
	}
	if updated.Color != "blue" {
		t.Fatalf("update with color kept %q, want normalized blue", updated.Color)
	}

	updated, err = repo.Update(created.ID, "タグ", nil)
	if err != nil {
		t.Fatalf("second update without color: %v", err)
	}
	if updated.Color != "blue" {
		t.Fatalf("second update without color rolled back to %q, want blue", updated.Color)
	}
}

func ptr(value string) *string {
	return &value
}
