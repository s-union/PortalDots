package page

import "testing"

func TestIsPublished(t *testing.T) {
	tests := []struct {
		name        string
		publishedAt string
		want        bool
	}{
		{name: "empty", publishedAt: "", want: false},
		{name: "invalid", publishedAt: "not-a-time", want: false},
		{name: "future", publishedAt: "2999-01-01T00:00:00Z", want: false},
		{name: "past", publishedAt: "2000-01-01T00:00:00Z", want: true},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			if got := IsPublished(testCase.publishedAt); got != testCase.want {
				t.Fatalf("IsPublished(%q) = %v; want %v", testCase.publishedAt, got, testCase.want)
			}
		})
	}
}
