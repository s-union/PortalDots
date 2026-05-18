package controllers

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

func demoModeMiddleware(enableDemoMode bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !enableDemoMode {
				return next(c)
			}

			method := c.Request().Method
			if method == http.MethodGet || method == http.MethodHead {
				return next(c)
			}

			path := c.Request().URL.Path
			if isDemoModeExceptPath(path) {
				return next(c)
			}

			accept := c.Request().Header.Get(echo.HeaderAccept)
			if strings.Contains(accept, echo.MIMEApplicationJSON) {
				return c.JSON(http.StatusForbidden, map[string]any{
					"message":   "デモサイトではこの機能は利用できません",
					"demo_mode": true,
				})
			}

			return c.JSON(http.StatusForbidden, map[string]any{
				"message":   "デモサイトではこの機能は利用できません",
				"demo_mode": true,
			})
		}
	}
}

func isDemoModeExceptPath(path string) bool {
	excepts := []string{
		"/v1/auth/login",
		"/v1/auth/logout",
		"/v1/staff/verify/confirm",
	}
	for _, except := range excepts {
		if path == except {
			return true
		}
	}
	if strings.HasPrefix(path, "/v1/circles/") && strings.HasSuffix(path, "/auth") {
		return true
	}
	if strings.HasPrefix(path, "/v1/staff/forms/") && strings.HasSuffix(path, "/questions") {
		return true
	}
	return false
}
