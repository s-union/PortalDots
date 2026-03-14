package httpapi

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

type sessionBootstrapResponse struct {
	CSRFToken     string      `json:"csrfToken"`
	CurrentCircle *circleInfo `json:"currentCircle"`
	FeatureFlags  []string    `json:"featureFlags"`
	Roles         []string    `json:"roles"`
	Permissions   []string    `json:"permissions"`
	User          *userInfo   `json:"user"`
}

type circleInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type userInfo struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

func (h *authHandlers) sessionBootstrap(c echo.Context) error {
	sessionID, currentSession, ok := h.getSession(c)
	if !ok || currentSession.User == nil {
		return c.JSON(http.StatusOK, sessionBootstrapResponse{
			CSRFToken:     "",
			CurrentCircle: nil,
			FeatureFlags:  []string{},
			Roles:         []string{},
			Permissions:   []string{},
			User:          nil,
		})
	}

	selectedCircle, err := resolveCurrentCircle(sessionID, currentSession, h.circles, h.sessions)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": "internal_error",
		})
	}

	return c.JSON(http.StatusOK, sessionBootstrapResponse{
		CSRFToken:     currentSession.CSRFToken,
		CurrentCircle: selectedCircle,
		FeatureFlags:  []string{},
		Roles:         append([]string{}, currentSession.User.Roles...),
		Permissions:   append([]string{}, currentSession.User.Permissions...),
		User: &userInfo{
			ID:          currentSession.User.ID,
			DisplayName: currentSession.User.DisplayName,
		},
	})
}

func resolveCurrentCircle(sessionID string, currentSession session.Session, circles circle.Catalog, store session.Store) (*circleInfo, error) {
	if currentSession.User == nil {
		return nil, nil
	}

	selectable, err := circles.ListSelectable(currentSession.User)
	if err != nil {
		return nil, err
	}
	if len(selectable) == 1 {
		onlyCircle := selectable[0]
		if currentSession.CurrentCircleID != onlyCircle.ID {
			store.Update(sessionID, func(next *session.Session) {
				next.CurrentCircleID = onlyCircle.ID
			})
		}
		return &circleInfo{
			ID:   onlyCircle.ID,
			Name: onlyCircle.Name,
		}, nil
	}

	if currentSession.CurrentCircleID == "" {
		return nil, nil
	}

	selectedCircle, err := circles.FindSelectable(currentSession.User, currentSession.CurrentCircleID)
	if errors.Is(err, circle.ErrNotFound) {
		store.Update(sessionID, func(next *session.Session) {
			next.CurrentCircleID = ""
		})
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &circleInfo{
		ID:   selectedCircle.ID,
		Name: selectedCircle.Name,
	}, nil
}
