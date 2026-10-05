package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/mailhistory"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
)

func TestListStaffMailsPaginationHTTPBoundary(t *testing.T) {
	mailHistory := mailhistory.NewMemoryRepository()
	for index := 0; index < 51; index++ {
		if err := mailHistory.Record(t.Context(), emailqueue.EmailJob{
			JobId:    fmt.Sprintf("pagination-mail-%02d", index),
			Template: "markdown-notice",
			Priority: emailqueue.PriorityNormal,
			Subject:  fmt.Sprintf("Subject %02d", index),
			Body:     "Body",
			To:       []string{"test@example.com"},
		}); err != nil {
			t.Fatalf("record mail %d: %v", index, err)
		}
	}

	handler := &staffAdminHandlers{
		sharedDeps: sharedDeps{
			sessionCookieName:   "test_session",
			sessionCookieTTL:    time.Hour,
			sessionCookieSecure: false,
			allowDangerously:    true,
			sessions:            session.NewMemoryStore(time.Hour),
		},
		circles:     circle.NewStaticCatalog(nil, config.AuthUser{}, nil),
		mailHistory: mailHistory,
	}

	request := func(query string) *httptest.ResponseRecorder {
		t.Helper()
		e := echo.New()
		req := httptest.NewRequest(http.MethodGet, "/v1/staff/mails"+query, nil)
		rec := httptest.NewRecorder()
		ctx := e.NewContext(req, rec)
		ctx.Set("httpapi.session_id", "staff-session")
		ctx.Set("httpapi.session", session.Session{
			StaffAuthorized: true,
			User: &auth.User{
				ID:    "staff-user",
				Roles: []string{"admin"},
			},
		})
		if err := handler.listStaffMails(ctx); err != nil {
			t.Fatalf("listStaffMails(%q): %v", query, err)
		}
		return rec
	}

	first := request("")
	if first.Code != http.StatusOK {
		t.Fatalf("default page status=%d body=%s; want 200", first.Code, first.Body.String())
	}
	var firstPage []staffMailResponse
	if err := json.Unmarshal(first.Body.Bytes(), &firstPage); err != nil {
		t.Fatalf("unmarshal default page: %v", err)
	}
	if len(firstPage) != 50 {
		t.Fatalf("default page length=%d; want 50", len(firstPage))
	}
	cursor := first.Header().Get("X-Next-Cursor")
	if cursor == "" {
		t.Fatal("expected X-Next-Cursor on default page")
	}

	second := request("?cursor=" + cursor)
	if second.Code != http.StatusOK {
		t.Fatalf("next page status=%d body=%s; want 200", second.Code, second.Body.String())
	}
	var secondPage []staffMailResponse
	if err := json.Unmarshal(second.Body.Bytes(), &secondPage); err != nil {
		t.Fatalf("unmarshal next page: %v", err)
	}
	if len(secondPage) != 1 {
		t.Fatalf("next page length=%d; want 1", len(secondPage))
	}
	if nextCursor := second.Header().Get("X-Next-Cursor"); nextCursor != "" {
		t.Fatalf("unexpected X-Next-Cursor after final page: %q", nextCursor)
	}

	seen := make(map[string]struct{}, len(firstPage)+len(secondPage))
	for _, page := range append(firstPage, secondPage...) {
		if _, exists := seen[page.JobId]; exists {
			t.Fatalf("duplicate job ID across pages: %s", page.JobId)
		}
		seen[page.JobId] = struct{}{}
	}
	if len(seen) != 51 {
		t.Fatalf("paged job count=%d; want 51", len(seen))
	}

	invalidLimit := request("?limit=0")
	if invalidLimit.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid limit status=%d body=%s; want 422", invalidLimit.Code, invalidLimit.Body.String())
	}
	invalidCursor := request("?cursor=invalid!")
	if invalidCursor.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid cursor status=%d body=%s; want 422", invalidCursor.Code, invalidCursor.Body.String())
	}
}
