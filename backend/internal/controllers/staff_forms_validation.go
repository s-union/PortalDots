package controllers

import (
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/formquestion"
)

func parseRFC3339Field(value string) (time.Time, bool) {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, false
	}

	return parsed, true
}

func bindAndValidateStaffForm(c *echo.Context, circleRequired bool) (mutateStaffFormRequest, map[string][]string, bool) {
	var request mutateStaffFormRequest
	if err := c.Bind(&request); err != nil {
		return mutateStaffFormRequest{}, map[string][]string{
			"request": {"invalid_request"},
		}, false
	}

	request.CircleID = strings.TrimSpace(request.CircleID)
	request.Name = strings.TrimSpace(request.Name)
	request.Description = strings.TrimSpace(request.Description)
	request.OpenAt = strings.TrimSpace(request.OpenAt)
	request.CloseAt = strings.TrimSpace(request.CloseAt)
	request.ConfirmationMessage = strings.TrimSpace(request.ConfirmationMessage)
	request.AnswerableTags = normalizeTags(request.AnswerableTags)
	request.StaffNotificationUserIDs = normalizeUserIDs(request.StaffNotificationUserIDs)

	errors := map[string][]string{}
	if circleRequired && request.CircleID == "" {
		errors["circleId"] = []string{"企画を選択してください"}
	}
	if request.Name == "" {
		errors["name"] = []string{"フォーム名を入力してください"}
	}
	if request.MaxAnswers < 1 {
		errors["maxAnswers"] = []string{"回答可能数は 1 以上にしてください"}
	}
	openAt, openOK := parseRFC3339Field(request.OpenAt)
	if !openOK {
		errors["openAt"] = []string{"開始日時は RFC3339 形式で入力してください"}
	}
	closeAt, closeOK := parseRFC3339Field(request.CloseAt)
	if !closeOK {
		errors["closeAt"] = []string{"締切日時は RFC3339 形式で入力してください"}
	}
	if openOK && closeOK && !openAt.Before(closeAt) {
		errors["closeAt"] = []string{"締切日時は開始日時より後にしてください"}
	}

	return request, errors, len(errors) == 0
}

func normalizeTags(tags []string) []string {
	normalized := make([]string, 0, len(tags))
	for _, tag := range tags {
		trimmed := strings.TrimSpace(tag)
		if trimmed == "" {
			continue
		}
		normalized = append(normalized, trimmed)
	}
	return normalized
}

func normalizeUserIDs(userIDs []string) []string {
	normalized := make([]string, 0, len(userIDs))
	seen := make(map[string]struct{}, len(userIDs))
	for _, userID := range userIDs {
		trimmed := strings.TrimSpace(userID)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}
	return normalized
}

func validateStaffFormQuestionRequest(request *updateStaffFormQuestionRequest) map[string][]string {
	errors := map[string][]string{}
	if !slices.Contains(formquestion.AllowedQuestionTypes, request.Type) {
		errors["type"] = []string{"設問タイプが不正です"}
	}
	if request.Type != "heading" && request.Name == "" {
		errors["name"] = []string{"設問名を入力してください"}
	}
	if request.Type == "number" && request.NumberMin != nil && request.NumberMax != nil && *request.NumberMin > *request.NumberMax {
		errors["numberMax"] = []string{"最大値は最小値以上にしてください"}
	}
	if (request.Type == "radio" || request.Type == "select" || request.Type == "checkbox") && len(request.Options) == 0 {
		errors["options"] = []string{"選択肢を 1 つ以上指定してください"}
	}
	if request.Type != "upload" {
		request.AllowedTypes = ""
	}

	return errors
}

func normalizeQuestionOptions(options []string) []string {
	normalized := make([]string, 0, len(options))
	for _, option := range options {
		trimmed := strings.TrimSpace(option)
		if trimmed == "" {
			continue
		}
		normalized = append(normalized, trimmed)
	}
	return normalized
}

// validateStaffNotificationUsers returns validation errors when a configured
// staff-copy recipient does not reference an existing user or no longer holds
// the formAnswers.read entitlement. Recipients are additionally re-checked
// against the current entitlement whenever an answer mail is sent, so a user
// de-privileged after the form was saved is still skipped at send time.
func (h *staffFormHandlers) validateStaffNotificationUsers(c *echo.Context, userIDs []string) map[string][]string {
	for _, userID := range userIDs {
		userValue, err := h.users.Find(userID)
		if err != nil {
			return map[string][]string{
				"staffNotificationUserIds": {"送信先に指定されたユーザーが存在しません"},
			}
		}
		if !hasCurrentFormAnswerAccess(userValue) {
			return map[string][]string{
				"staffNotificationUserIds": {"送信先に指定されたユーザーにはフォーム回答の閲覧権限がありません"},
			}
		}
	}
	return map[string][]string{}
}
