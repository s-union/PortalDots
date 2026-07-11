package middlewares

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func TestAccessLogRedactsContactAttachmentToken(t *testing.T) {
	var logs bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	t.Cleanup(func() { slog.SetDefault(previousLogger) })

	e := echo.New()
	e.Use(AccessLogMiddleware())
	e.GET("/v1/contact/attachments/:token", func(c *echo.Context) error {
		return c.NoContent(http.StatusNotFound)
	})

	const token = "sensitive-download-token"
	request := httptest.NewRequest(http.MethodGet, "/v1/contact/attachments/"+token, nil)
	recorder := httptest.NewRecorder()
	e.ServeHTTP(recorder, request)

	if strings.Contains(logs.String(), token) {
		t.Fatalf("access log exposed attachment token: %s", logs.String())
	}
	if !strings.Contains(logs.String(), "/v1/contact/attachments/:token") {
		t.Fatalf("access log omitted redacted route: %s", logs.String())
	}
}
