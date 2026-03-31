package controllers

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/binary"
	"fmt"
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
	VerifyCode   string `json:"verifyCode,omitempty"`
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

	verifyCode, err := generateStaffVerifyCode()
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_generate_verify_code")
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.StaffAuthorized = false
		next.StaffVerifyCode = verifyCode
		next.StaffVerifyExpires = time.Now().UTC().Add(staffVerifyTTL)
	})

	response := staffVerifyRequestResponse{
		DeliveryMode: "email",
		Message:      "認証コードを送信しました。メールをご確認ください。",
	}
	if h.allowInsecureDefaults {
		response.DeliveryMode = "mock"
		response.Message = "モック中: メールは送信していません。画面に表示された認証コードを入力してください。"
		response.VerifyCode = verifyCode
	}

	return c.JSON(http.StatusOK, response)
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
		len(currentSession.StaffVerifyCode) != len(request.VerifyCode) ||
		subtle.ConstantTimeCompare([]byte(currentSession.StaffVerifyCode), []byte(request.VerifyCode)) != 1 ||
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

func generateStaffVerifyCode() (string, error) {
	var raw [4]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", binary.BigEndian.Uint32(raw[:])%1000000), nil
}
