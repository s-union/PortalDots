package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type formSummaryResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	OpenAt      string `json:"openAt"`
	CloseAt     string `json:"closeAt"`
	IsPublic    bool   `json:"isPublic"`
	IsOpen      bool   `json:"isOpen"`
	HasAnswer   bool   `json:"hasAnswer"`
	MaxAnswers  int32  `json:"maxAnswers"`
}

type formDetailResponse struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description"`
	OpenAt      string              `json:"openAt"`
	CloseAt     string              `json:"closeAt"`
	IsPublic    bool                `json:"isPublic"`
	IsOpen      bool                `json:"isOpen"`
	MaxAnswers  int32               `json:"maxAnswers"`
	HasAnswer   bool                `json:"hasAnswer,omitempty"`
	Questions   []staffFormQuestion `json:"questions"`
}

func (h *workspaceHandlers) listForms(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"message": "unauthenticated",
		})
	}
	if currentSession.CurrentCircleID == "" {
		return c.JSON(http.StatusConflict, map[string]string{
			"message": "current_circle_required",
		})
	}

	forms := h.forms.ListByCircle(currentSession.CurrentCircleID)
	response := make([]formSummaryResponse, 0, len(forms))
	for _, form := range forms {
		_, answered := h.answers.Get(form.ID, currentSession.CurrentCircleID)
		response = append(response, formSummaryResponse{
			ID:          form.ID,
			Name:        form.Name,
			Description: form.Description,
			OpenAt:      form.OpenAt,
			CloseAt:     form.CloseAt,
			IsPublic:    form.IsPublic,
			IsOpen:      form.IsOpen,
			HasAnswer:   answered,
			MaxAnswers:  form.MaxAnswers,
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *workspaceHandlers) getForm(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"message": "unauthenticated",
		})
	}
	if currentSession.CurrentCircleID == "" {
		return c.JSON(http.StatusConflict, map[string]string{
			"message": "current_circle_required",
		})
	}

	form, found := h.forms.FindByCircle(currentSession.CurrentCircleID, c.Param("formID"))
	if !found {
		return c.JSON(http.StatusNotFound, map[string]string{
			"message": "form_not_found",
		})
	}

	questions, err := h.formQuestions.List(form.ID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": "internal_error",
		})
	}

	return c.JSON(http.StatusOK, formDetailResponse{
		ID:          form.ID,
		Name:        form.Name,
		Description: form.Description,
		OpenAt:      form.OpenAt,
		CloseAt:     form.CloseAt,
		IsPublic:    form.IsPublic,
		IsOpen:      form.IsOpen,
		MaxAnswers:  form.MaxAnswers,
		HasAnswer:   len(h.answers.ListByFormAndCircle(form.ID, currentSession.CurrentCircleID)) > 0,
		Questions:   mapStaffFormQuestions(questions),
	})
}
