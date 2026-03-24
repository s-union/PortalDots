package middlewares

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

// Setup applies the standard middleware stack to the Echo instance.
func Setup(e *echo.Echo) {
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
}

const sessionContextKey = "httpapi.session"
const sessionIDContextKey = "httpapi.session_id"

// SessionAccess provides minimal session operations required by route middlewares.
type SessionAccess interface {
	Get(id string) (session.Session, bool)
}

// SessionMiddlewareConfig configures session-aware middlewares.
type SessionMiddlewareConfig struct {
	SessionCookieName     string
	AllowInsecureDefaults bool
	Sessions              SessionAccess
}

// RequireWorkspaceUser ensures a valid authenticated session exists.
func RequireWorkspaceUser(cfg SessionMiddlewareConfig) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			sessionID, currentSession, ok := getSessionFromCookie(c, cfg)
			if !ok || currentSession.User == nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"message": "unauthenticated",
				})
			}
			c.Set(sessionIDContextKey, sessionID)
			c.Set(sessionContextKey, currentSession)
			return next(c)
		}
	}
}

// RequireStaffMode ensures a valid staff-authenticated session exists.
func RequireStaffMode(cfg SessionMiddlewareConfig, hasStaffAccess func([]string, []string) bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			sessionID, currentSession, ok := getSessionFromCookie(c, cfg)
			if !ok || currentSession.User == nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"message": "unauthenticated",
				})
			}
			if !hasStaffAccess(currentSession.User.Roles, currentSession.User.Permissions) {
				return c.JSON(http.StatusForbidden, map[string]string{
					"message": "staff_forbidden",
				})
			}
			if !cfg.AllowInsecureDefaults && !currentSession.StaffAuthorized {
				return c.JSON(http.StatusForbidden, map[string]string{
					"message": "staff_forbidden",
				})
			}
			c.Set(sessionIDContextKey, sessionID)
			c.Set(sessionContextKey, currentSession)
			return next(c)
		}
	}
}

// SessionFromContext returns the session id and session value captured by middleware, if available.
func SessionFromContext(c echo.Context) (string, session.Session, bool) {
	storedID := c.Get(sessionIDContextKey)
	stored := c.Get(sessionContextKey)
	if storedID == nil || stored == nil {
		return "", session.Session{}, false
	}
	sessionID, ok := storedID.(string)
	if !ok || sessionID == "" {
		return "", session.Session{}, false
	}
	currentSession, ok := stored.(session.Session)
	if !ok {
		return "", session.Session{}, false
	}
	return sessionID, currentSession, true
}

func getSessionFromCookie(c echo.Context, cfg SessionMiddlewareConfig) (string, session.Session, bool) {
	cookie, err := c.Cookie(cfg.SessionCookieName)
	if err != nil || cookie.Value == "" {
		return "", session.Session{}, false
	}
	currentSession, ok := cfg.Sessions.Get(cookie.Value)
	if !ok {
		return "", session.Session{}, false
	}
	return cookie.Value, currentSession, true
}
