package controllers

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/models"
)

type loginRequest struct {
	LoginID  string `json:"loginId"`
	Password string `json:"password"`
	Remember bool   `json:"remember"`
}

func trustedClientSignal(c *echo.Context) string {
	remoteAddr := strings.TrimSpace(c.Request().RemoteAddr)
	if host, _, err := net.SplitHostPort(remoteAddr); err == nil {
		if ip := net.ParseIP(host); ip != nil {
			return ip.String()
		}
	}
	if ip := net.ParseIP(remoteAddr); ip != nil {
		return ip.String()
	}
	return "unknown"
}

func loginAttemptKey(loginID, clientSignal string) string {
	normalizedLoginID := strings.ToLower(strings.TrimSpace(loginID))
	digest := sha256.Sum256([]byte(normalizedLoginID))
	return hex.EncodeToString(digest[:]) + ":" + clientSignal
}

func (h *authHandlers) login(c *echo.Context) error {
	var request loginRequest
	if err := c.Bind(&request); err != nil {
		return errorJSON(c, http.StatusBadRequest, "invalid_request")
	}

	request.LoginID = strings.TrimSpace(request.LoginID)

	validationErrors := map[string][]string{}
	if request.LoginID == "" {
		validationErrors["loginId"] = []string{"学籍番号または連絡先メールアドレスを入力してください"}
	}
	if request.Password == "" {
		validationErrors["password"] = []string{"パスワードを入力してください"}
	}
	if len(validationErrors) > 0 {
		return validationError(c, validationErrors)
	}

	attemptKey := loginAttemptKey(request.LoginID, trustedClientSignal(c))
	if locked, _ := h.loginAttempts.IsLocked(attemptKey); locked {
		return c.JSON(http.StatusTooManyRequests, models.ValidationErrorResponse{
			Message: "rate_limit_exceeded",
			Errors: map[string][]string{
				"loginId": {"しばらく経ってからもう一度お試しください。"},
			},
		})
	}

	user, ok := h.authenticator.Authenticate(c.Request().Context(), request.LoginID, request.Password)
	if !ok {
		h.loginAttempts.RecordFailure(attemptKey)
		return c.JSON(http.StatusUnprocessableEntity, models.ValidationErrorResponse{
			Message: "authentication_failed",
			Errors: map[string][]string{
				"loginId": {"ログイン情報が正しくありません"},
			},
		})
	}

	managedUser, err := h.users.Find(user.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		h.loginAttempts.RecordFailure(attemptKey)
		return c.JSON(http.StatusUnprocessableEntity, models.ValidationErrorResponse{
			Message: "authentication_failed",
			Errors: map[string][]string{
				"loginId": {"ログイン情報が正しくありません"},
			},
		})
	}
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_load_user")
	}
	user.DisplayName = managedUser.DisplayName
	user.Roles = append([]string{}, managedUser.Roles...)
	user.Permissions = append([]string{}, managedUser.Permissions...)

	h.loginAttempts.RecordSuccess(attemptKey)
	_ = h.sessions.DeleteByUserID(c.Request().Context(), user.ID)

	sessionID, _, err := h.sessions.Create(c.Request().Context(), user)
	if err != nil {
		return errorJSON(c, http.StatusInternalServerError, "failed_to_create_session")
	}

	cookie := &http.Cookie{
		Name:     h.sessionCookieName,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.sessionCookieSecure,
	}
	if request.Remember {
		cookie.MaxAge = int(h.sessionCookieTTL.Seconds())
		cookie.Expires = time.Now().Add(h.sessionCookieTTL).UTC()
	}
	c.SetCookie(cookie)

	return c.NoContent(http.StatusNoContent)
}

func (h *authHandlers) logout(c *echo.Context) error {
	cookie, err := c.Cookie(h.sessionCookieName)
	if err == nil && cookie.Value != "" {
		_ = h.sessions.Delete(c.Request().Context(), cookie.Value)
	}

	c.SetCookie(&http.Cookie{
		Name:     h.sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0).UTC(),
		SameSite: http.SameSiteLaxMode,
		Secure:   h.sessionCookieSecure,
	})

	return c.NoContent(http.StatusNoContent)
}
