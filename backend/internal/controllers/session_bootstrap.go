package controllers

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
)

type sessionBootstrapResponse struct {
	CSRFToken     string                    `json:"csrfToken"`
	CurrentCircle *circleInfo               `json:"currentCircle"`
	FeatureFlags  []string                  `json:"featureFlags"`
	Roles         []string                  `json:"roles"`
	Permissions   []string                  `json:"permissions"`
	User          *sessionBootstrapUserInfo `json:"user"`
}

type circleInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type sessionBootstrapUserInfo struct {
	ID                          string `json:"id"`
	DisplayName                 string `json:"displayName"`
	CanDeleteAccount            bool   `json:"canDeleteAccount"`
	CanCreateCircleRegistration bool   `json:"canCreateCircleRegistration"`
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

	managedUser, err := h.users.Find(currentSession.User.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		h.sessions.Delete(sessionID)
		return c.JSON(http.StatusOK, sessionBootstrapResponse{
			CSRFToken:     "",
			CurrentCircle: nil,
			FeatureFlags:  []string{},
			Roles:         []string{},
			Permissions:   []string{},
			User:          nil,
		})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": "internal_error",
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
		Roles:         append([]string{}, managedUser.Roles...),
		Permissions:   append([]string{}, managedUser.Permissions...),
		User: &sessionBootstrapUserInfo{
			ID:                          managedUser.ID,
			DisplayName:                 managedUser.DisplayName,
			CanDeleteAccount:            !hasStaffAccess(managedUser.Roles, managedUser.Permissions) && len(managedUser.CircleIDs) == 0,
			CanCreateCircleRegistration: canCreateCircleRegistration(managedUser),
		},
	})
}

func canCreateCircleRegistration(userValue useradmin.User) bool {
	if len(userValue.CircleIDs) == 0 {
		return true
	}
	return len(userValue.LeaderCircleIDs) > 0
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
