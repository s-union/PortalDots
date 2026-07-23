package middlewares

import (
	"log/slog"
	"path"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
)

// contactAttachmentPathPrefix is the URL prefix under which download tokens
// appear. Tokens grant permanent public access, so any path starting with
// this prefix must have the token portion redacted before being logged,
// even when routing does not match the registered route (e.g. wrong method,
// 404, or extra trailing segments).
const contactAttachmentPathPrefix = "/v1/contact/attachments/"

// contactAttachmentRoutePath is the canonical redacted path logged for any
// request under contactAttachmentPathPrefix.
const contactAttachmentRoutePath = contactAttachmentPathPrefix + ":token"

// normalizeForRedactionCheck lowercases the path and resolves dot segments and
// repeated slashes so the prefix check below cannot be bypassed by case
// variation (e.g. "/v1/Contact/..."), duplicated slashes (e.g.
// "//v1/contact/...", "/v1/contact//attachments/..."), or dot segments (e.g.
// "/v1/contact/./attachments/..."). req.URL.Path is already percent-decoded by
// net/http, so no additional decoding is needed here.
func normalizeForRedactionCheck(requestPath string) string {
	return path.Clean(strings.ToLower(requestPath))
}

// AccessLogMiddleware logs every HTTP request using structured logging.
func AccessLogMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			start := time.Now()
			err := next(c)
			elapsed := time.Since(start)

			req := c.Request()
			statusCode := 0
			if res, unwrapErr := echo.UnwrapResponse(c.Response()); unwrapErr == nil {
				statusCode = res.Status
			}
			path := req.URL.Path
			if c.Path() == contactAttachmentRoutePath {
				path = contactAttachmentRoutePath
			} else if strings.HasPrefix(normalizeForRedactionCheck(path), contactAttachmentPathPrefix) {
				path = contactAttachmentRoutePath
			}

			attrs := []any{
				"method", req.Method,
				"path", path,
				"status", statusCode,
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
