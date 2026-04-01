package controllers

import (
	"reflect"
	"testing"

	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
)

func TestNormalizeAnswerDetails(t *testing.T) {
	t.Parallel()

	questions := []formquestion.Question{
		{ID: "heading-1", Type: "heading", Name: "見出し"},
		{ID: "text-1", Type: "text", Name: "名前", IsRequired: true},
		{ID: "checkbox-1", Type: "checkbox", Name: "希望", Options: []string{"A", "B"}},
		{ID: "upload-1", Type: "upload", Name: "証明書", IsRequired: true},
	}

	t.Run("normalizes answers and required upload", func(t *testing.T) {
		t.Parallel()

		raw := map[string]any{
			"text-1":     "  山田太郎  ",
			"checkbox-1": []any{"A", "  "},
		}
		uploads := []answer.Upload{
			{QuestionID: "upload-1", Filename: "proof.pdf"},
		}

		normalized, validationErrors := normalizeAnswerDetails(raw, questions, uploads)

		wantNormalized := map[string][]string{
			"text-1":     {"山田太郎"},
			"checkbox-1": {"A"},
		}
		if !reflect.DeepEqual(normalized, wantNormalized) {
			t.Fatalf("unexpected normalized answers: %#v", normalized)
		}
		if len(validationErrors) != 0 {
			t.Fatalf("expected no validation errors, got %#v", validationErrors)
		}
	})

	t.Run("reports required and invalid questions", func(t *testing.T) {
		t.Parallel()

		raw := map[string]any{
			"checkbox-1": []string{"C"},
		}

		normalized, validationErrors := normalizeAnswerDetails(raw, questions, nil)

		if len(normalized) != 0 {
			t.Fatalf("expected no normalized answers, got %#v", normalized)
		}
		wantErrors := map[string][]string{
			"details.text-1":     {"この設問は必須です"},
			"details.checkbox-1": {"選択肢の値が不正です"},
			"details.upload-1":   {"この設問は必須です"},
		}
		if !reflect.DeepEqual(validationErrors, wantErrors) {
			t.Fatalf("unexpected validation errors: %#v", validationErrors)
		}
	})
}

func TestNormalizeAnswerValues(t *testing.T) {
	t.Parallel()

	min := int32(2)
	max := int32(5)

	testCases := []struct {
		name       string
		question   formquestion.Question
		rawValue   any
		hasValue   bool
		wantValues []string
		wantErrors []string
	}{
		{
			name:       "upload questions ignore body values",
			question:   formquestion.Question{Type: "upload"},
			rawValue:   "ignored",
			hasValue:   true,
			wantValues: nil,
			wantErrors: nil,
		},
		{
			name:       "checkbox rejects invalid payload",
			question:   formquestion.Question{Type: "checkbox"},
			rawValue:   []any{"ok", map[string]string{"bad": "value"}},
			hasValue:   true,
			wantValues: nil,
			wantErrors: []string{"選択肢の形式が不正です"},
		},
		{
			name: "number validates minimum",
			question: formquestion.Question{
				Type:      "number",
				NumberMin: &min,
				NumberMax: &max,
			},
			rawValue:   "1",
			hasValue:   true,
			wantValues: nil,
			wantErrors: []string{"2 以上の値を入力してください"},
		},
		{
			name: "number validates parse failure",
			question: formquestion.Question{
				Type: "number",
			},
			rawValue:   "abc",
			hasValue:   true,
			wantValues: nil,
			wantErrors: []string{"数値を入力してください"},
		},
		{
			name: "select rejects value outside options",
			question: formquestion.Question{
				Type:    "select",
				Options: []string{"A", "B"},
			},
			rawValue:   "C",
			hasValue:   true,
			wantValues: nil,
			wantErrors: []string{"選択肢の値が不正です"},
		},
		{
			name: "text trims values",
			question: formquestion.Question{
				Type: "text",
			},
			rawValue:   "  hello  ",
			hasValue:   true,
			wantValues: []string{"hello"},
			wantErrors: nil,
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			values, errors := normalizeAnswerValues(tc.question, tc.rawValue, tc.hasValue)
			if !reflect.DeepEqual(values, tc.wantValues) {
				t.Fatalf("unexpected values: %#v", values)
			}
			if !reflect.DeepEqual(errors, tc.wantErrors) {
				t.Fatalf("unexpected errors: %#v", errors)
			}
		})
	}
}

func TestValidateUploadExtension(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name     string
		question formquestion.Question
		filename string
		want     string
	}{
		{
			name:     "rejects upload when no types configured",
			question: formquestion.Question{Type: "upload"},
			filename: "proof.pdf",
			want:     "この設問ではアップロードを受け付けていません",
		},
		{
			name:     "rejects missing extension",
			question: formquestion.Question{Type: "upload", AllowedTypes: "pdf"},
			filename: "proof",
			want:     "許可されていない拡張子です",
		},
		{
			name:     "accepts normalized extension list",
			question: formquestion.Question{Type: "upload", AllowedTypes: ".PDF, jpg\n png"},
			filename: "proof.PDF",
			want:     "",
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			if got := validateUploadExtension(tc.question, tc.filename); got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}

func TestNormalizeAllowedTypes(t *testing.T) {
	t.Parallel()

	got := normalizeAllowedTypes(".PDF, jpg\n png\t")
	want := []string{"pdf", "jpg", "png"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected allowed types: %#v", got)
	}
}

func TestBuildAnswerSummary(t *testing.T) {
	t.Parallel()

	questions := []formquestion.Question{
		{ID: "heading-1", Type: "heading", Name: "見出し"},
		{ID: "text-1", Type: "text", Name: "名前"},
		{ID: "upload-1", Type: "upload", Name: "証明書"},
	}
	details := map[string][]string{
		"text-1": {"山田太郎"},
	}
	uploads := []answer.Upload{
		{QuestionID: "upload-1", Filename: "proof.pdf"},
		{QuestionID: "upload-1", Filename: "note.txt"},
	}

	got := buildAnswerSummary(questions, details, uploads)
	want := "名前: 山田太郎\n証明書: proof.pdf, note.txt"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestCloneAnswerDetails(t *testing.T) {
	t.Parallel()

	original := map[string][]string{
		"q1": {"A", "B"},
	}

	cloned := cloneAnswerDetails(original)
	cloned["q1"][0] = "changed"
	cloned["q2"] = []string{"new"}

	if original["q1"][0] != "A" {
		t.Fatalf("expected original slice to be cloned, got %#v", original["q1"])
	}
	if _, ok := original["q2"]; ok {
		t.Fatalf("expected original map not to gain new key, got %#v", original)
	}
}
