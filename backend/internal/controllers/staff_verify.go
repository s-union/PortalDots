package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

const staffVerifyTTL = 5 * time.Minute

type staffStatusResponse struct {
	Allowed    bool `json:"allowed"`
	Authorized bool `json:"authorized"`
}

type staffVerifyRequestResponse struct {
	DeliveryMode string `json:"deliveryMode"`
	Message      string `json:"message"`
	VerifyCode   string `json:"verifyCode"`
}

type confirmStaffVerificationRequest struct {
	VerifyCode string `json:"verifyCode"`
}

func (h *staffVerifyHandlers) staffStatus(c echo.Context) error {
	_, currentSession, status, ok := h.requireStaffUser(c)
	if !ok {
		return statusError(c, status)
	}

	allowed := hasStaffAccess(currentSession.User.Roles, currentSession.User.Permissions)
	authorized := allowed && (h.allowInsecureDefaults || currentSession.StaffAuthorized)

	return c.JSON(http.StatusOK, staffStatusResponse{
		Allowed:    allowed,
		Authorized: authorized,
	})
}

func (h *staffVerifyHandlers) requestStaffVerification(c echo.Context) error {
	sessionID, _, status, ok := h.requireStaffUser(c)
	if !ok {
		return statusError(c, status)
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.StaffAuthorized = false
		next.StaffVerifyCode = h.staffVerifyCode
		next.StaffVerifyExpires = time.Now().UTC().Add(staffVerifyTTL)
	})

	return c.JSON(http.StatusOK, staffVerifyRequestResponse{
		DeliveryMode: "mock",
		Message:      "モック中: メールは送信していません。画面に表示された認証コードを入力してください。",
		VerifyCode:   h.staffVerifyCode,
	})
}

func (h *staffVerifyHandlers) confirmStaffVerification(c echo.Context) error {
	sessionID, currentSession, status, ok := h.requireStaffUser(c)
	if !ok {
		return statusError(c, status)
	}

	var request confirmStaffVerificationRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.VerifyCode = strings.TrimSpace(request.VerifyCode)
	if request.VerifyCode == "" {
		return validationError(c, map[string][]string{
			"verifyCode": {"認証コードを入力してください"},
		})
	}

	if currentSession.StaffVerifyCode == "" ||
		currentSession.StaffVerifyCode != request.VerifyCode ||
		time.Now().UTC().After(currentSession.StaffVerifyExpires) {
		return validationError(c, map[string][]string{
			"verifyCode": {"認証コードが間違っているか、期限切れです。再度お試しください。"},
		})
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.StaffAuthorized = true
		next.StaffVerifyCode = ""
		next.StaffVerifyExpires = time.Time{}
	})

	return c.NoContent(http.StatusNoContent)
}

func (s *sharedDeps) requireStaffUser(c echo.Context) (string, session.Session, int, bool) {
	sessionID, currentSession, ok := s.getSession(c)
	if !ok || currentSession.User == nil {
		return "", session.Session{}, http.StatusUnauthorized, false
	}
	if !hasStaffAccess(currentSession.User.Roles, currentSession.User.Permissions) {
		return "", session.Session{}, http.StatusForbidden, false
	}

	return sessionID, currentSession, http.StatusOK, true
}

func (s *sharedDeps) requireStaffMode(c echo.Context) (string, session.Session, int, bool) {
	sessionID, currentSession, status, ok := s.requireStaffUser(c)
	if !ok {
		return "", session.Session{}, status, false
	}
	if s.allowInsecureDefaults {
		return sessionID, currentSession, http.StatusOK, true
	}
	if !currentSession.StaffAuthorized {
		return "", session.Session{}, http.StatusForbidden, false
	}

	return sessionID, currentSession, http.StatusOK, true
}
