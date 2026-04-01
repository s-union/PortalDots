//go:build ignore

package workspacehttp

import (
	"net/http"
	"slices"
	"sort"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	backendform "github.com/s-union/PortalDots/backend/internal/domain/form"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
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
	Questions           []staffFormQuestion `json:"questions"`
}

func (h *workspaceHandlers) listForms(c echo.Context) error {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return statusError(c, status)
	}

	forms, err := h.listAccessibleWorkspaceForms(currentCircle)
	if err != nil {
		return internalError(c)
	}
	response := make([]formSummaryResponse, 0, len(forms))
	for _, form := range forms {
		response = append(response, h.buildWorkspaceFormSummaryResponse(form, currentSession.CurrentCircleID))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *workspaceHandlers) getForm(c echo.Context) error {
	currentSession, currentCircle, status, ok := h.currentWorkspaceSessionAndCircle(c)
	if !ok {
		return statusError(c, status)
	}

	form, found := h.findAccessibleWorkspaceForm(c.Param("formID"), currentCircle)
	if !found {
		return errorJSON(c, http.StatusNotFound, "form_not_found")
	}

	questions, err := h.formQuestions.List(form.ID)
	if err != nil {
		return internalError(c)
	}

	return c.JSON(
		http.StatusOK,
		h.buildWorkspaceFormDetailResponse(
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

func (h *workspaceHandlers) listAccessibleWorkspaceForms(currentCircle circle.Circle) ([]backendform.Form, error) {
	formsByID := make(map[string]backendform.Form)
	for _, formValue := range h.forms.ListByCircleForStaff(currentCircle.ID) {
		if !h.canAccessWorkspaceForm(currentCircle, formValue) {
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

func (h *workspaceHandlers) findAccessibleWorkspaceForm(formID string, currentCircle circle.Circle) (backendform.Form, bool) {
	formValue, found := h.forms.FindByCircleForStaff(currentCircle.ID, formID)
	if !found || !h.canAccessWorkspaceForm(currentCircle, formValue) {
		return backendform.Form{}, false
	}

	return formValue, true
}

func (h *workspaceHandlers) canAccessWorkspaceForm(currentCircle circle.Circle, formValue backendform.Form) bool {
	if formValue.CircleID != currentCircle.ID {
		return false
	}
	if !formValue.IsPublic || h.isWorkspaceParticipationForm(formValue.ID) {
		return false
	}
	if len(formValue.AnswerableTags) == 0 {
		return true
	}

	for _, circleTag := range effectiveCircleTags(currentCircle, h.participationTypes) {
		if slices.Contains(formValue.AnswerableTags, circleTag) {
			return true
		}
	}

	return false
}

func (h *workspaceHandlers) isWorkspaceParticipationForm(formID string) bool {
	_, err := h.participationTypes.FindByFormID(formID)
	return err == nil
}

func (h *workspaceHandlers) buildWorkspaceFormSummaryResponse(formValue backendform.Form, currentCircleID string) formSummaryResponse {
	_, answered := h.answers.Get(formValue.ID, currentCircleID)

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
	formValue backendform.Form,
	currentCircleID string,
	currentCircle circle.Circle,
	questions []staffFormQuestion,
) formDetailResponse {
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
		HasAnswer:           len(h.answers.ListByFormAndCircle(formValue.ID, currentCircleID)) > 0,
		AnswerableTags:      slices.Clone(formValue.AnswerableTags),
		ConfirmationMessage: formValue.ConfirmationMessage,
		Questions:           questions,
	}
}
