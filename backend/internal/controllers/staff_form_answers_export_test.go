package controllers

import "testing"

func TestSanitizeArchiveFilename(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		filename string
		want     string
	}{
		{
			name:     "keeps simple filename",
			filename: "document.pdf",
			want:     "document.pdf",
		},
		{
			name:     "normalizes parent traversal",
			filename: "../evil.txt",
			want:     "evil.txt",
		},
		{
			name:     "normalizes nested traversal",
			filename: "../../nested/evil.txt",
			want:     "evil.txt",
		},
		{
			name:     "handles empty filename",
			filename: "   ",
			want:     "upload.bin",
		},
		{
			name:     "handles dot-only filename",
			filename: ".",
			want:     "upload.bin",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := sanitizeArchiveFilename(tt.filename); got != tt.want {
				t.Fatalf("sanitizeArchiveFilename(%q) = %q, want %q", tt.filename, got, tt.want)
			}
		})
	}
}
