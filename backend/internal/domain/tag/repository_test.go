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
	for _, color := range []string{"gray", "red", "orange", "green", "blue", "purple", "", "RED"} {
		if !IsValidColor(color) {
			t.Fatalf("IsValidColor(%q) = false, want true", color)
		}
	}
	for _, color := range []string{"teal", "neon", "#ff0000", "reddish"} {
		if IsValidColor(color) {
			t.Fatalf("IsValidColor(%q) = true, want false", color)
		}
	}
}
