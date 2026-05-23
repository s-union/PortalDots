package middlewares

import (
	"log/slog"
	"time"

	"github.com/labstack/echo/v5"
)

// AccessLogMiddleware logs every HTTP request using structured logging.
func AccessLogMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			start := time.Now()
			err := next(c)
			elapsed := time.Since(start)

			req := c.Request()
			res := c.Response()

			attrs := []any{
				"method", req.Method,
				"path", req.URL.Path,
				"status", res.Status,
				"ip", c.RealIP(),
				"latency_ms", elapsed.Milliseconds(),
			}
			if req.URL.RawQuery != "" {
				attrs = append(attrs, "query", req.URL.RawQuery)
			}
			if err != nil {
				attrs = append(attrs, "error", err.Error())
				slog.Error("request", attrs...)
			} else {
				slog.Info("request", attrs...)
			}
			return err
		}
	}
}
