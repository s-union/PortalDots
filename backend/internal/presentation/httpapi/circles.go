package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

type selectableCircleResponse struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	GroupName             string `json:"groupName"`
	ParticipationTypeName string `json:"participationTypeName"`
}

type setCurrentCircleRequest struct {
	CircleID string `json:"circleId"`
}

func (h *workspaceHandlers) listCircles(c echo.Context) error {
	_, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"message": "unauthenticated",
		})
	}

	circles, err := h.circles.ListSelectable(currentSession.User)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": "internal_error",
		})
	}

	response := make([]selectableCircleResponse, 0, len(circles))
	for _, selectable := range circles {
		response = append(response, selectableCircleResponse{
			ID:                    selectable.ID,
			Name:                  selectable.Name,
			GroupName:             selectable.GroupName,
			ParticipationTypeName: selectable.ParticipationTypeName,
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *workspaceHandlers) setCurrentCircle(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"message": "unauthenticated",
		})
	}

	var request setCurrentCircleRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"message": "invalid_request",
		})
	}

	request.CircleID = strings.TrimSpace(request.CircleID)
	if request.CircleID == "" {
		return c.JSON(http.StatusUnprocessableEntity, validationErrorResponse{
			Message: "validation_error",
			Errors: map[string][]string{
				"circleId": {"企画を選択してください"},
			},
		})
	}

	selectedCircle, err := h.circles.FindSelectable(currentSession.User, request.CircleID)
	if errors.Is(err, circle.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]string{
			"message": "circle_not_found",
		})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": "internal_error",
		})
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.CurrentCircleID = selectedCircle.ID
	})

	return c.NoContent(http.StatusNoContent)
}
