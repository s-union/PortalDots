package controllers

import (
	"context"
	"net/http"
	"slices"
	"sort"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/models"
)

type formSummaryResponse struct {
	ID                  string   `json:"id"`
	Name                string   `json:"name"`
	Description         string   `json:"description"`
	OpenAt              string   `json:"openAt"`
	CloseAt             string   `json:"closeAt"`
	IsPublic            bool     `json:"isPublic"`
	IsOpen              bool     `json:"isOpen"`
	HasAnswer           bool     `json:"hasAnswer"`
	MaxAnswers          int32    `json:"maxAnswers"`
	AnswerableTags      []string `json:"answerableTags"`
	ConfirmationMessage string   `json:"confirmationMessage"`
}

type formDetailResponse struct {
	ID                  string              `json:"id"`
	Name                string              `json:"name"`
	Description         string              `json:"description"`
	OpenAt              string              `json:"openAt"`
	CloseAt             string              `json:"closeAt"`
	IsPublic            bool                `json:"isPublic"`
	IsOpen              bool                `json:"isOpen"`
	CurrentCircleStatus string              `json:"currentCircleStatus"`
	MaxAnswers          int32               `json:"maxAnswers"`
	HasAnswer           bool                `json:"hasAnswer,omitempty"`
	AnswerableTags      []string            `json:"answerableTags"`
	ConfirmationMessage string              `json:"confirmationMessage"`
	CreatedByUserID     string              `json:"createdByUserId"`
	Questions           []staffFormQuestion `json:"questions"`
}

func (h *workspaceHandlers) listForms(c echo.Context) error {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return statusError(c, status)
	}

	forms, err := h.listAccessibleWorkspaceForms(c.Request().Context(), currentCircle, c.QueryParam("status"), c.QueryParam("query"))
	if err != nil {
		return internalError(c)
	}
	pagination := readPagination(c)
	paginated := paginateItems(forms, pagination)

	response := make([]formSummaryResponse, 0, len(forms))
	for _, form := range paginated.Items {
		response = append(response, h.buildWorkspaceFormSummaryResponse(c.Request().Context(), form, currentSession.CurrentCircleID))
	}

	return c.JSON(http.StatusOK, models.PaginatedResponse[formSummaryResponse]{
		Items:    response,
		Page:     paginated.Page,
		PageSize: paginated.PageSize,
		Total:    paginated.Total,
	})
}

func (h *workspaceHandlers) getForm(c echo.Context) error {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return statusError(c, status)
	}

	form, found := h.findAccessibleWorkspaceForm(c.Request().Context(), c.Param("formID"), currentCircle)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	questions, err := h.formQuestions.List(c.Request().Context(), form.ID)
	if err != nil {
		return internalError(c)
	}

	return c.JSON(
		http.StatusOK,
		h.buildWorkspaceFormDetailResponse(c.Request().Context(),
			form,
			currentSession.CurrentCircleID,
			currentCircle,
			mapStaffFormQuestions(filterWorkspaceFormQuestions(questions)),
		),
	)
}

func (h *workspaceHandlers) currentWorkspaceSessionAndCircle(c echo.Context) (session.Session, circle.Circle, int, bool) {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return session.Session{}, circle.Circle{}, http.StatusUnauthorized, false
	}
	if currentSession.CurrentCircleID == "" {
		return session.Session{}, circle.Circle{}, http.StatusConflict, false
	}

	currentCircle, err := h.circles.GetUserCircle(currentSession.User, currentSession.CurrentCircleID)
	if err != nil {
		return session.Session{}, circle.Circle{}, http.StatusNotFound, false
	}

	return currentSession, currentCircle, http.StatusOK, true
}

func (h *workspaceHandlers) listAccessibleWorkspaceForms(ctx context.Context, currentCircle circle.Circle, status string, query string) ([]backendform.Form, error) {
	formsByID := make(map[string]backendform.Form)
	normalizedQuery := normalizeWorkspaceFormQuery(query)
	for _, formValue := range h.forms.ListByCircleForStaff(currentCircle.ID) {
		if !h.canAccessWorkspaceForm(ctx, currentCircle, formValue) || !matchesWorkspaceFormStatus(formValue, status) || !matchesWorkspaceFormQuery(formValue, normalizedQuery) {
			continue
		}
		formsByID[formValue.ID] = formValue
	}
	for _, formValue := range h.forms.ListByCircleForStaff("") {
		if !h.canAccessWorkspaceForm(ctx, currentCircle, formValue) || !matchesWorkspaceFormStatus(formValue, status) || !matchesWorkspaceFormQuery(formValue, normalizedQuery) {
			continue
		}
		formsByID[formValue.ID] = formValue
	}

	forms := make([]backendform.Form, 0, len(formsByID))
	for _, formValue := range formsByID {
		forms = append(forms, formValue)
	}
	sort.Slice(forms, func(i, j int) bool {
		if forms[i].CloseAt == forms[j].CloseAt {
			return forms[i].ID < forms[j].ID
		}
		return forms[i].CloseAt < forms[j].CloseAt
	})

	return forms, nil
}

func normalizeWorkspaceFormQuery(query string) string {
	return strings.ToLower(strings.TrimSpace(query))
}

func matchesWorkspaceFormQuery(formValue backendform.Form, normalizedQuery string) bool {
	if normalizedQuery == "" {
		return true
	}

	haystack := strings.ToLower(strings.Join([]string{
		formValue.ID,
		formValue.Name,
		formValue.Description,
	}, "\n"))
	return strings.Contains(haystack, normalizedQuery)
}

func matchesWorkspaceFormStatus(formValue backendform.Form, status string) bool {
	switch status {
	case "open", "":
		return formValue.IsOpen
	case "closed":
		return !formValue.IsOpen
	case "all":
		return true
	default:
		return formValue.IsOpen
	}
}

func (h *workspaceHandlers) findAccessibleWorkspaceForm(ctx context.Context, formID string, currentCircle circle.Circle) (backendform.Form, bool) {
	if formValue, found := h.forms.FindByCircleForStaff(currentCircle.ID, formID); found && h.canAccessWorkspaceForm(ctx, currentCircle, formValue) {
		return formValue, true
	}

	formValue, found := h.forms.FindByCircleForStaff("", formID)
	if !found || !h.canAccessWorkspaceForm(ctx, currentCircle, formValue) {
		return backendform.Form{}, false
	}

	return formValue, true
}

func (h *workspaceHandlers) canAccessWorkspaceForm(ctx context.Context, currentCircle circle.Circle, formValue backendform.Form) bool {
	if formValue.CircleID != "" && formValue.CircleID != currentCircle.ID {
		return false
	}
	if !formValue.IsPublic || h.isWorkspaceParticipationForm(ctx, formValue.ID) {
		return false
	}
	if len(formValue.AnswerableTags) == 0 {
		return true
	}

	for _, circleTag := range effectiveCircleTags(ctx, currentCircle, h.participationTypes) {
		if slices.Contains(formValue.AnswerableTags, circleTag) {
			return true
		}
	}

	return false
}

func (h *workspaceHandlers) isWorkspaceParticipationForm(ctx context.Context, formID string) bool {
	_, err := h.participationTypes.FindByFormID(ctx, formID)
	return err == nil
}

func (h *workspaceHandlers) buildWorkspaceFormSummaryResponse(ctx context.Context, formValue backendform.Form, currentCircleID string) formSummaryResponse {
	_, answered := h.answers.Get(ctx, formValue.ID, currentCircleID)

	return formSummaryResponse{
		ID:                  formValue.ID,
		Name:                formValue.Name,
		Description:         formValue.Description,
		OpenAt:              formValue.OpenAt,
		CloseAt:             formValue.CloseAt,
		IsPublic:            formValue.IsPublic,
		IsOpen:              formValue.IsOpen,
		HasAnswer:           answered,
		MaxAnswers:          formValue.MaxAnswers,
		AnswerableTags:      slices.Clone(formValue.AnswerableTags),
		ConfirmationMessage: formValue.ConfirmationMessage,
	}
}

func (h *workspaceHandlers) buildWorkspaceFormDetailResponse(
	ctx context.Context,
	formValue backendform.Form,
	currentCircleID string,
	currentCircle circle.Circle,
	questions []staffFormQuestion,
) formDetailResponse {
	_, answered := h.answers.Get(ctx, formValue.ID, currentCircleID)

	return formDetailResponse{
		ID:                  formValue.ID,
		Name:                formValue.Name,
		Description:         formValue.Description,
		OpenAt:              formValue.OpenAt,
		CloseAt:             formValue.CloseAt,
		IsPublic:            formValue.IsPublic,
		IsOpen:              formValue.IsOpen,
		CurrentCircleStatus: currentCircle.Status,
		MaxAnswers:          formValue.MaxAnswers,
		HasAnswer:           answered,
		AnswerableTags:      slices.Clone(formValue.AnswerableTags),
		ConfirmationMessage: formValue.ConfirmationMessage,
		CreatedByUserID:     formValue.CreatedByUserID,
		Questions:           questions,
	}
}
