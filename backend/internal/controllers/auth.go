package controllers

import (
	"errors"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/models"
)

type loginRequest struct {
	LoginID  string `json:"loginId"`
	Password string `json:"password"`
	Remember bool   `json:"remember"`
}

type loginAttempt struct {
	count       int
	lastFail    time.Time
	lockedUntil *time.Time
}

type loginAttemptTracker struct {
	mu              sync.RWMutex
	attempts        map[string]*loginAttempt
	maxAttempts     int
	lockoutDuration time.Duration
}

func newLoginAttemptTracker(maxAttempts int, lockoutDuration time.Duration) *loginAttemptTracker {
	return &loginAttemptTracker{
		attempts:        make(map[string]*loginAttempt),
		maxAttempts:     maxAttempts,
		lockoutDuration: lockoutDuration,
	}
}

func (t *loginAttemptTracker) isLocked(ip string) (bool, time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()

	attempt, ok := t.attempts[ip]
	if !ok || attempt.lockedUntil == nil {
		return false, time.Time{}
	}
	if time.Now().Before(*attempt.lockedUntil) {
		return true, *attempt.lockedUntil
	}
	delete(t.attempts, ip)
	return false, time.Time{}
}

func (t *loginAttemptTracker) recordFailure(ip string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	attempt, ok := t.attempts[ip]
	if !ok {
		attempt = &loginAttempt{}
		t.attempts[ip] = attempt
	}
	attempt.count++
	attempt.lastFail = time.Now()
	if attempt.count >= t.maxAttempts {
		lockedUntil := time.Now().Add(t.lockoutDuration)
		attempt.lockedUntil = &lockedUntil
	}
}

func (t *loginAttemptTracker) recordSuccess(ip string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.attempts, ip)
}

func clientIP(c echo.Context) string {
	if ip := c.RealIP(); ip != "" {
		return ip
	}
	if host, _, err := net.SplitHostPort(c.Request().RemoteAddr); err == nil {
		return host
	}
	return c.Request().RemoteAddr
}

func (h *authHandlers) login(c echo.Context) error {
	ip := clientIP(c)

	if locked, _ := h.loginAttempts.isLocked(ip); locked {
		return c.JSON(http.StatusTooManyRequests, models.ValidationErrorResponse{
			Message: "rate_limit_exceeded",
			Errors: map[string][]string{
				"loginId": {"しばらく経ってからもう一度お試しください。"},
			},
		})
	}

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

	user, ok := h.authenticator.Authenticate(c.Request().Context(), request.LoginID, request.Password)
	if !ok {
		h.loginAttempts.recordFailure(ip)
		return c.JSON(http.StatusUnprocessableEntity, models.ValidationErrorResponse{
			Message: "authentication_failed",
			Errors: map[string][]string{
				"loginId": {"ログイン情報が正しくありません"},
			},
		})
	}

	managedUser, err := h.users.Find(user.ID)
	if errors.Is(err, useradmin.ErrNotFound) {
		h.loginAttempts.recordFailure(ip)
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

	h.loginAttempts.recordSuccess(ip)
	_ = h.sessions.DeleteByUserID(user.ID)

	sessionID, _, err := h.sessions.Create(user)
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

func (h *authHandlers) logout(c echo.Context) error {
	cookie, err := c.Cookie(h.sessionCookieName)
	if err == nil && cookie.Value != "" {
		_ = h.sessions.Delete(cookie.Value)
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
