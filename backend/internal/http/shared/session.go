//go:build ignore

package shared

import (
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/middlewares"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
)

type SessionDeps struct {
	SessionCookieName     string
	SessionCookieTTL      time.Duration
	SessionCookieSecure   bool
	StaffVerifyCode       string
	AllowInsecureDefaults bool
	Sessions              session.Store
}

func NewSessionDeps(cfg config.Config, store session.Store) SessionDeps {
	return SessionDeps{
		SessionCookieName:     cfg.SessionCookieName,
		SessionCookieTTL:      cfg.SessionTTL,
		SessionCookieSecure:   cfg.SessionCookieSecure,
		StaffVerifyCode:       cfg.StaffVerifyCode,
		AllowInsecureDefaults: cfg.AllowInsecureDefaults,
		Sessions:              store,
	}
}

func (s SessionDeps) GetSession(c echo.Context) (string, session.Session, bool) {
	if sessionID, currentSession, ok := middlewares.SessionFromContext(c); ok {
		return sessionID, currentSession, true
	}

	cookie, err := c.Cookie(s.SessionCookieName)
	if err != nil || cookie.Value == "" {
		return "", session.Session{}, false
	}

	currentSession, ok := s.Sessions.Get(cookie.Value)
	if !ok {
		return "", session.Session{}, false
	}

	return cookie.Value, currentSession, true
}
