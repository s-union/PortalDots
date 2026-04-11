package controllers

import (
	"mime"
	"net/http"
	"strings"
	"testing"
)

func TestWorkspaceEndpointsRejectStaleCurrentCircleMembership(t *testing.T) {
	t.Parallel()

	server := NewServer(testStaffConfig())
	participantCookies := map[string]*http.Cookie{}
	staffCookies := map[string]*http.Cookie{}

	recorder := doJSONRequest(t, server, participantCookies, http.MethodPost, "/v1/auth/login", map[string]string{
		"loginId":  "0195ec00-0022-7000-8000-000000000001-unverified@example.com",
		"password": "password",
	})
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}
	selectCircle(t, server, participantCookies, "0195ec00-0022-7000-8000-000000000001")

	for _, path := range []string{"/v1/pages", "/v1/documents", "/v1/circles/current/members"} {
		recorder = doJSONRequest(t, server, participantCookies, http.MethodGet, path, nil)
		if recorder.Code != http.StatusOK {
			t.Fatalf("expected precondition status %d for %s, got %d, body=%s", http.StatusOK, path, recorder.Code, recorder.Body.String())
		}
	}

	loginAsStaff(t, server, staffCookies)
	authorizeStaff(t, server, staffCookies)

	recorder = doJSONRequest(t, server, staffCookies, http.MethodDelete, "/v1/staff/circles/0195ec00-0022-7000-8000-000000000001/members/0195ec00-0056-7000-8000-000000000001", nil)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusNoContent, recorder.Code, recorder.Body.String())
	}

	for _, path := range []string{
		"/v1/pages",
		"/v1/pages/0195ec00-0034-7000-8000-000000000001",
		"/v1/documents",
		"/v1/documents/0195ec00-0042-7000-8000-000000000001",
		"/v1/circles/current/members",
	} {
		recorder = doJSONRequest(t, server, participantCookies, http.MethodGet, path, nil)
		if recorder.Code != http.StatusNotFound {
			t.Fatalf("expected status %d for %s, got %d, body=%s", http.StatusNotFound, path, recorder.Code, recorder.Body.String())
		}
	}
}

func TestAttachmentContentDispositionSanitizesFilename(t *testing.T) {
	t.Parallel()

	contentDisposition := attachmentContentDisposition("report\"\r\nSet-Cookie: injected=true.txt")
	if strings.ContainsAny(contentDisposition, "\r\n") {
		t.Fatalf("content disposition must not contain CR/LF: %q", contentDisposition)
	}

	mediaType, params, err := mime.ParseMediaType(contentDisposition)
	if err != nil {
		t.Fatalf("parse content disposition: %v", err)
	}
	if mediaType != "attachment" {
		t.Fatalf("expected attachment media type, got %q", mediaType)
	}
	if strings.ContainsAny(params["filename"], "\r\n") {
		t.Fatalf("filename must not contain CR/LF: %q", params["filename"])
	}
}

func TestInlineContentDispositionUsesFallbackFilename(t *testing.T) {
	t.Parallel()

	contentDisposition := inlineContentDisposition("")
	mediaType, params, err := mime.ParseMediaType(contentDisposition)
	if err != nil {
		t.Fatalf("parse content disposition: %v", err)
	}
	if mediaType != "inline" {
		t.Fatalf("expected inline media type, got %q", mediaType)
	}
	if params["filename"] != defaultInlineFilename {
		t.Fatalf("expected fallback filename %q, got %q", defaultInlineFilename, params["filename"])
	}
}
