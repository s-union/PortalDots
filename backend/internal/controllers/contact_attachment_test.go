package controllers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/contact"
)

func TestDetectAllowedContactAttachment(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name     string
		filename string
		content  []byte
		wantOK   bool
	}{
		{name: "pdf", filename: "proposal.pdf", content: []byte("%PDF-1.7\n"), wantOK: true},
		{name: "jpeg", filename: "image.jpg", content: append([]byte{0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0x00}, make([]byte, 512)...), wantOK: true},
		{name: "extension mismatch", filename: "proposal.png", content: []byte("%PDF-1.7\n")},
		{name: "disallowed", filename: "archive.zip", content: []byte("PK\x03\x04")},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, ok := detectAllowedContactAttachment(test.filename, test.content)
			if ok != test.wantOK {
				t.Errorf("detectAllowedContactAttachment(%q) ok = %v, want %v", test.filename, ok, test.wantOK)
			}
		})
	}
}

func TestValidContactFilenameRejectsHeaderInjectionAndPaths(t *testing.T) {
	t.Parallel()
	for _, filename := range []string{"", "../proposal.pdf", `..\\proposal.pdf`, "proposal.pdf\r\nX-Test: value", "\x00.pdf"} {
		if validContactFilename(filename) {
			t.Errorf("validContactFilename(%q) = true, want false", filename)
		}
	}
	if !validContactFilename("企画書.pdf") {
		t.Fatal("validContactFilename() rejected a safe UTF-8 filename")
	}
}

func TestContactRequestBodyLimitRejectsBeforeHandler(t *testing.T) {
	t.Parallel()
	e := echo.New()
	e.Pre(contactRequestBodyLimit())
	called := false
	e.POST("/v1/contact", func(c *echo.Context) error {
		called = true
		return c.NoContent(http.StatusCreated)
	})

	request := httptest.NewRequest(http.MethodPost, "/v1/contact", strings.NewReader("body"))
	request.ContentLength = maxContactRequestBytes + 1
	recorder := httptest.NewRecorder()
	e.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusRequestEntityTooLarge || called {
		t.Fatalf("oversized request status = %d, handler called = %v; want 413 before handler", recorder.Code, called)
	}
}

func TestDownloadContactAttachmentUsesOpaqueTokenAndSafeHeaders(t *testing.T) {
	t.Parallel()
	repository := contact.NewMemoryRepository()
	_, rawToken, err := repository.Create(context.Background(), contact.NewContact{
		UserID: "user-a", CircleID: "circle-a", CategoryID: "category-a", CategoryName: "General",
		Subject: "Subject", Body: "Body", Status: "sent", StaffMailJobID: "contact-job-a",
	}, &contact.NewAttachment{Filename: "企画書.pdf", MimeType: "application/pdf", Content: []byte("%PDF-1.7")})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	handler := (&authHandlers{contacts: repository}).downloadContactAttachment

	unknownToken, _, err := contact.GenerateDownloadToken()
	if err != nil {
		t.Fatalf("GenerateDownloadToken() error = %v", err)
	}
	for _, token := range []string{"invalid", unknownToken} {
		e := echo.New()
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, "/", nil)
		ctx := e.NewContext(request, recorder)
		ctx.SetPathValues([]echo.PathValue{{Name: "token", Value: token}})
		if err := handler(ctx); err != nil {
			t.Fatalf("download malformed token returned error: %v", err)
		}
		if recorder.Code != http.StatusNotFound {
			t.Errorf("download malformed token status = %d, want 404", recorder.Code)
		}
	}

	e := echo.New()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx := e.NewContext(request, recorder)
	ctx.SetPathValues([]echo.PathValue{{Name: "token", Value: rawToken}})
	if err := handler(ctx); err != nil {
		t.Fatalf("download valid token returned error: %v", err)
	}
	if recorder.Code != http.StatusOK || recorder.Body.String() != "%PDF-1.7" {
		t.Fatalf("download response = %d %q, want attachment", recorder.Code, recorder.Body.String())
	}
	if recorder.Header().Get("Cache-Control") != "no-store" || recorder.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("unsafe download headers: %#v", recorder.Header())
	}
	if disposition := recorder.Header().Get("Content-Disposition"); !strings.HasPrefix(disposition, "attachment;") || strings.Contains(disposition, "\r") {
		t.Fatalf("unsafe Content-Disposition = %q", disposition)
	}
}
