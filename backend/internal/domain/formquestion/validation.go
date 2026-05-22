package formquestion

import (
	"fmt"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"github.com/s-union/PortalDots/backend/internal/domain/answer"
)

func NormalizeAnswerDetails(raw map[string]any, questions []Question, uploads []answer.Upload) (map[string][]string, map[string][]string) {
	normalized := map[string][]string{}
	validationErrors := map[string][]string{}
	uploadsByQuestion := GroupUploadsByQuestion(uploads)

	for _, question := range questions {
		if question.Type == "heading" {
			continue
		}

		rawValue, hasValue := raw[question.ID]
		values, valueErrors := NormalizeAnswerValues(question, rawValue, hasValue)
		if len(valueErrors) > 0 {
			validationErrors["details."+question.ID] = valueErrors
			continue
		}

		if len(values) > 0 {
			normalized[question.ID] = values
		}

		if question.IsRequired && !QuestionHasAnswer(question, values, uploadsByQuestion[question.ID]) {
			validationErrors["details."+question.ID] = []string{"この設問は必須です"}
		}
	}

	return normalized, validationErrors
}

func NormalizeAnswerValues(question Question, rawValue any, hasValue bool) ([]string, []string) {
	if question.Type == "upload" {
		return nil, nil
	}
	if !hasValue || rawValue == nil {
		return nil, nil
	}

	switch question.Type {
	case "checkbox":
		values, ok := StringSliceFromAny(rawValue)
		if !ok {
			return nil, []string{"選択肢の形式が不正です"}
		}
		filtered := FilterEmptyStrings(values)
		if len(filtered) == 0 {
			return nil, nil
		}
		if len(question.Options) > 0 && !AllInOptions(filtered, question.Options) {
			return nil, []string{"選択肢の値が不正です"}
		}
		return filtered, nil
	default:
		value, ok := StringFromAny(rawValue)
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
		if slices.Contains([]string{"text", "textarea", "markdown"}, question.Type) {
			if question.NumberMin != nil && len([]rune(value)) < int(*question.NumberMin) {
				return nil, []string{fmt.Sprintf("%d 文字以上で入力してください", *question.NumberMin)}
			}
			if question.NumberMax != nil && len([]rune(value)) > int(*question.NumberMax) {
				return nil, []string{fmt.Sprintf("%d 文字以下で入力してください", *question.NumberMax)}
			}
		}
		if slices.Contains([]string{"radio", "select"}, question.Type) && len(question.Options) > 0 && !slices.Contains(question.Options, value) {
			return nil, []string{"選択肢の値が不正です"}
		}
		return []string{value}, nil
	}
}

func QuestionHasAnswer(question Question, values []string, uploads []answer.Upload) bool {
	if question.Type == "upload" {
		return len(uploads) > 0
	}
	return len(values) > 0
}

func GroupUploadsByQuestion(uploads []answer.Upload) map[string][]answer.Upload {
	grouped := map[string][]answer.Upload{}
	for _, upload := range uploads {
		grouped[upload.QuestionID] = append(grouped[upload.QuestionID], upload)
	}
	return grouped
}

func FindUploadQuestion(questions []Question, questionID string) (Question, bool) {
	for _, question := range questions {
		if question.ID == questionID && question.Type == "upload" {
			return question, true
		}
	}
	return Question{}, false
}

func ValidateUploadExtension(question Question, filename string) string {
	allowedTypes := NormalizeAllowedTypes(question.AllowedTypes)
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

func NormalizeAllowedTypes(value string) []string {
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

func BuildAnswerSummary(questions []Question, details map[string][]string, uploads []answer.Upload) string {
	uploadsByQuestion := GroupUploadsByQuestion(uploads)
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

func StringSliceFromAny(value any) ([]string, bool) {
	switch typedValue := value.(type) {
	case []string:
		return typedValue, true
	case []any:
		values := make([]string, 0, len(typedValue))
		for _, item := range typedValue {
			stringValue, ok := StringFromAny(item)
			if !ok {
				return nil, false
			}
			values = append(values, stringValue)
		}
		return values, true
	default:
		stringValue, ok := StringFromAny(value)
		if !ok {
			return nil, false
		}
		return []string{stringValue}, true
	}
}

func StringFromAny(value any) (string, bool) {
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

func FilterEmptyStrings(values []string) []string {
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

func AllInOptions(values []string, options []string) bool {
	for _, value := range values {
		if !slices.Contains(options, value) {
			return false
		}
	}
	return true
}

func CloneAnswerDetails(details map[string][]string) map[string][]string {
	if len(details) == 0 {
		return map[string][]string{}
	}

	cloned := make(map[string][]string, len(details))
	for questionID, values := range details {
		cloned[questionID] = append([]string(nil), values...)
	}
	return cloned
}
