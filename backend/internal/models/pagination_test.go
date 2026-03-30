package models

import "testing"

func TestParsePositiveIntFallsBackOnInvalidAndOverflow(t *testing.T) {
	t.Parallel()

	const fallback = 7
	tests := []struct {
		name string
		raw  string
		want int
	}{
		{name: "empty", raw: "", want: fallback},
		{name: "non_digit", raw: "12a3", want: fallback},
		{name: "zero", raw: "0", want: fallback},
		{name: "negative_like", raw: "-1", want: fallback},
		{name: "overflow", raw: "99999999999999999999999999999999999999", want: fallback},
		{name: "valid", raw: "42", want: 42},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := parsePositiveInt(tt.raw, fallback); got != tt.want {
				t.Fatalf("parsePositiveInt(%q) = %d, want %d", tt.raw, got, tt.want)
			}
		})
	}
}

func TestPaginateItemsHandlesBounds(t *testing.T) {
	t.Parallel()

	items := []int{1, 2, 3}

	result := PaginateItems(items, PaginationParams{
		Page:     3,
		PageSize: 2,
	})
	if len(result.Items) != 0 || result.Total != 3 || result.Page != 3 || result.PageSize != 2 {
		t.Fatalf("unexpected out-of-range pagination result: %#v", result)
	}

	result = PaginateItems(items, PaginationParams{
		Page:     1,
		PageSize: 2,
	})
	if len(result.Items) != 2 || result.Items[0] != 1 || result.Items[1] != 2 {
		t.Fatalf("unexpected first page result: %#v", result)
	}

	result = PaginateItems(items, PaginationParams{
		Page:     2,
		PageSize: 2,
	})
	if len(result.Items) != 1 || result.Items[0] != 3 {
		t.Fatalf("unexpected second page result: %#v", result)
	}
}
