package controllers

import (
	"context"
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
	Message string `json:"message"`
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
	sessionID, currentSession, status, ok := h.requireStaffUser(c)
	if !ok {
		return statusError(c, status)
	}

	verifyCode := h.staffVerifyCode
	if h.allowInsecureDefaults || strings.TrimSpace(verifyCode) == "" {
		generatedCode, err := generateStaffVerifyCode()
		if err != nil {
			return errorJSON(c, http.StatusInternalServerError, "failed_to_generate_verify_code")
		}
		verifyCode = generatedCode
	}

	h.sessions.Update(sessionID, func(next *session.Session) {
		next.StaffAuthorized = false
		next.StaffVerifyCode = verifyCode
		next.StaffVerifyExpires = time.Now().UTC().Add(staffVerifyTTL)
	})

	if h.allowInsecureDefaults {
		logMockVerificationCode("staff_verify_code", currentSession.User.DisplayName, verifyCode)
		return c.JSON(http.StatusOK, staffVerifyRequestResponse{
			Message: "認証コードを送信しました。",
		})
	}
	managedUser, err := h.users.Find(currentSession.User.ID)
	if err != nil {
		return internalError(c)
	}
	recipients := collectUserEmailRecipients(managedUser)
	if err := h.enqueueStaffVerifyCodeMail(c.Request().Context(), currentSession.User.ID, currentSession.CurrentCircleID, currentSession.User.DisplayName, verifyCode, recipients); err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, staffVerifyRequestResponse{
		Message: "認証コードを送信しました。",
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

func (h *staffVerifyHandlers) enqueueStaffVerifyCodeMail(
	ctx context.Context,
	createdByUserID,
	circleID,
	displayName,
	verifyCode string,
	recipients []string,
) error {
	normalizedRecipients := normalizeRecipients(recipients)
	if len(normalizedRecipients) == 0 {
		return fmt.Errorf("staff verify recipient not found")
	}

	subject := fmt.Sprintf("スタッフ認証 (認証コード : %s)", verifyCode)
	body := strings.TrimSpace(fmt.Sprintf(
		`スタッフ認証

%s 様

%s のスタッフモードにアクセスするには、以下の認証コードをスタッフ認証ページに入力してください。

認証コード: %s`,
		displayName,
		h.appName,
		verifyCode,
	))

	job, err := h.mails.Enqueue(ctx, circleID, createdByUserID, subject, body, normalizedRecipients)
	if err != nil {
		return err
	}
	logQueuedMail("staff_verify_code", job.ID, job.CircleID, job.CreatedByUserID, job.Subject, job.Body, job.Recipients)

	return nil
}
