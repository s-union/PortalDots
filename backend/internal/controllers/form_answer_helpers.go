package controllers

import (
	"fmt"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/answer"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
)

func normalizeAnswerDetails(raw map[string]any, questions []formquestion.Question, uploads []answer.Upload) (map[string][]string, map[string][]string) {
	normalized := map[string][]string{}
	validationErrors := map[string][]string{}
	uploadsByQuestion := groupUploadsByQuestion(uploads)

	for _, question := range questions {
		if question.Type == "heading" {
			continue
		}

		rawValue, hasValue := raw[question.ID]
		values, valueErrors := normalizeAnswerValues(question, rawValue, hasValue)
		if len(valueErrors) > 0 {
			validationErrors["details."+question.ID] = valueErrors
			continue
		}

		if len(values) > 0 {
			normalized[question.ID] = values
		}

		if question.IsRequired && !questionHasAnswer(question, values, uploadsByQuestion[question.ID]) {
			validationErrors["details."+question.ID] = []string{"この設問は必須です"}
		}
	}

	return normalized, validationErrors
}

func normalizeAnswerValues(question formquestion.Question, rawValue any, hasValue bool) ([]string, []string) {
	if question.Type == "upload" {
		return nil, nil
	}
	if !hasValue || rawValue == nil {
		return nil, nil
	}

	switch question.Type {
	case "checkbox":
		values, ok := stringSliceFromAny(rawValue)
		if !ok {
			return nil, []string{"選択肢の形式が不正です"}
		}
		filtered := filterEmptyStrings(values)
		if len(filtered) == 0 {
			return nil, nil
		}
		if len(question.Options) > 0 && !allInOptions(filtered, question.Options) {
			return nil, []string{"選択肢の値が不正です"}
		}
		return filtered, nil
	default:
		value, ok := stringFromAny(rawValue)
		if !ok {
			return nil, []string{"入力形式が不正です"}
		}
		value = strings.TrimSpace(value)
		if value == "" {
			return nil, nil
		}
		if question.Type == "number" {
			parsed, err := strconv.ParseFloat(value, 64)
			if err != nil {
				return nil, []string{"数値を入力してください"}
			}
			if question.NumberMin != nil && parsed < float64(*question.NumberMin) {
				return nil, []string{fmt.Sprintf("%d 以上の値を入力してください", *question.NumberMin)}
			}
			if question.NumberMax != nil && parsed > float64(*question.NumberMax) {
				return nil, []string{fmt.Sprintf("%d 以下の値を入力してください", *question.NumberMax)}
			}
		}
		if slices.Contains([]string{"radio", "select"}, question.Type) && len(question.Options) > 0 && !slices.Contains(question.Options, value) {
			return nil, []string{"選択肢の値が不正です"}
		}
		return []string{value}, nil
	}
}

func questionHasAnswer(question formquestion.Question, values []string, uploads []answer.Upload) bool {
	if question.Type == "upload" {
		return len(uploads) > 0
	}
	return len(values) > 0
}

func groupUploadsByQuestion(uploads []answer.Upload) map[string][]answer.Upload {
	grouped := map[string][]answer.Upload{}
	for _, upload := range uploads {
		grouped[upload.QuestionID] = append(grouped[upload.QuestionID], upload)
	}
	return grouped
}

func findUploadQuestion(questions []formquestion.Question, questionID string) (formquestion.Question, bool) {
	for _, question := range questions {
		if question.ID == questionID && question.Type == "upload" {
			return question, true
		}
	}
	return formquestion.Question{}, false
}

func validateUploadExtension(question formquestion.Question, filename string) string {
	allowedTypes := normalizeAllowedTypes(question.AllowedTypes)
	if len(allowedTypes) == 0 {
		return "この設問ではアップロードを受け付けていません"
	}

	extension := strings.TrimPrefix(strings.ToLower(filepath.Ext(filename)), ".")
	if extension == "" {
		return "許可されていない拡張子です"
	}
	if !slices.Contains(allowedTypes, extension) {
		return "許可されていない拡張子です"
	}
	return ""
}

func normalizeAllowedTypes(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	parts := strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == '\n' || r == '\r' || r == ' ' || r == '\t'
	})
	normalized := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(part)), ".")
		if part == "" {
			continue
		}
		normalized = append(normalized, part)
	}
	return normalized
}

func buildAnswerSummary(questions []formquestion.Question, details map[string][]string, uploads []answer.Upload) string {
	uploadsByQuestion := groupUploadsByQuestion(uploads)
	lines := make([]string, 0, len(questions))

	for _, question := range questions {
		if question.Type == "heading" {
			continue
		}

		switch question.Type {
		case "upload":
			questionUploads := uploadsByQuestion[question.ID]
			if len(questionUploads) == 0 {
				continue
			}

			filenames := make([]string, 0, len(questionUploads))
			for _, upload := range questionUploads {
				filenames = append(filenames, upload.Filename)
			}
			lines = append(lines, question.Name+": "+strings.Join(filenames, ", "))
		default:
			values := details[question.ID]
			if len(values) == 0 {
				continue
			}
			lines = append(lines, question.Name+": "+strings.Join(values, ", "))
		}
	}

	return strings.Join(lines, "\n")
}

func stringSliceFromAny(value any) ([]string, bool) {
	switch typedValue := value.(type) {
	case []string:
		return typedValue, true
	case []any:
		values := make([]string, 0, len(typedValue))
		for _, item := range typedValue {
			stringValue, ok := stringFromAny(item)
			if !ok {
				return nil, false
			}
			values = append(values, stringValue)
		}
		return values, true
	default:
		stringValue, ok := stringFromAny(value)
		if !ok {
			return nil, false
		}
		return []string{stringValue}, true
	}
}

func stringFromAny(value any) (string, bool) {
	switch typedValue := value.(type) {
	case string:
		return typedValue, true
	case float64:
		return strconv.FormatFloat(typedValue, 'f', -1, 64), true
	case int:
		return strconv.Itoa(typedValue), true
	default:
		return "", false
	}
}

func filterEmptyStrings(values []string) []string {
	filtered := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		filtered = append(filtered, value)
	}
	return filtered
}

func allInOptions(values []string, options []string) bool {
	for _, value := range values {
		if !slices.Contains(options, value) {
			return false
		}
	}
	return true
}

func cloneAnswerDetails(details map[string][]string) map[string][]string {
	if len(details) == 0 {
		return map[string][]string{}
	}

	cloned := make(map[string][]string, len(details))
	for questionID, values := range details {
		cloned[questionID] = append([]string(nil), values...)
	}
	return cloned
}
