package middlewares

import (
	"crypto/subtle"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

// SetupConfig configures the standard middleware stack.
type SetupConfig struct {
	// AllowedOrigins is a list of origins allowed for CORS requests.
	// If empty, CORS middleware is not added.
	AllowedOrigins []string
	// RateLimit configures IP-based rate limiting. Zero value disables it.
	RateLimit RateLimitConfig
	// MaintenanceMode, if true, returns 503 for all requests except /healthz.
	MaintenanceMode bool
}

// Setup applies the standard middleware stack to the Echo instance.
func Setup(e *echo.Echo, cfg SetupConfig) {
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(middleware.SecureWithConfig(middleware.SecureConfig{
		XSSProtection:      "",
		ContentTypeNosniff: "nosniff",
		XFrameOptions:      "DENY",
		HSTSMaxAge:         0,
	}))
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			c.Response().Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
			c.Response().Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			c.Response().Header().Set("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()")
			return next(c)
		}
	})
	e.Use(AccessLogMiddleware())
	if cfg.MaintenanceMode {
		e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
			return func(c echo.Context) error {
				if c.Request().URL.Path == "/healthz" {
					return next(c)
				}
				return c.JSON(http.StatusServiceUnavailable, map[string]string{
					"message": "maintenance_mode",
				})
			}
		})
	}
	e.Use(RateLimitMiddleware(cfg.RateLimit))
	e.Use(TransformExternalIDs())
	if len(cfg.AllowedOrigins) > 0 {
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins:     cfg.AllowedOrigins,
			AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodHead, http.MethodOptions},
			AllowHeaders:     []string{echo.HeaderContentType, "X-CSRF-Token"},
			AllowCredentials: true,
		}))
	}
}

// VerifyCSRF validates the X-CSRF-Token header against the session's CSRF token
// for state-mutating requests (POST, PUT, PATCH, DELETE).
// Requests with no active session (e.g. the login endpoint) are skipped.
func VerifyCSRF(cfg SessionMiddlewareConfig) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			method := c.Request().Method
			if method == http.MethodGet || method == http.MethodHead ||
				method == http.MethodOptions || method == http.MethodTrace {
				return next(c)
			}

			cookie, err := c.Cookie(cfg.SessionCookieName)
			if err != nil || cookie.Value == "" {
				return next(c)
			}
			currentSession, ok := cfg.Sessions.Get(cookie.Value)
			if !ok {
				return next(c)
			}

			token := c.Request().Header.Get("X-CSRF-Token")
			expectedToken := currentSession.CSRFToken
			if len(token) != len(expectedToken) || subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
				return c.JSON(http.StatusForbidden, map[string]string{
					"message": "csrf_token_invalid",
				})
			}

			return next(c)
		}
	}
}

const sessionContextKey = "httpapi.session"
const sessionIDContextKey = "httpapi.session_id"

// SessionAccess provides minimal session operations required by route middlewares.
type SessionAccess interface {
	Get(id string) (session.Session, bool)
}

// SessionMiddlewareConfig configures session-aware middlewares.
type SessionMiddlewareConfig struct {
	SessionCookieName string
	AllowDangerously  bool
	Sessions          SessionAccess
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
			if !cfg.AllowDangerously && !currentSession.StaffAuthorized {
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
