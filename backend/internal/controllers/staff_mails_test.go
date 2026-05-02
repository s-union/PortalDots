package controllers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/mailqueue"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

func TestListStaffMailsAllowsMissingCircle(t *testing.T) {
	t.Parallel()

	mails := mailqueue.NewMemoryRepository()
	if _, err := mails.Enqueue(context.Background(), "0195ec00-00b2-7000-8000-000000000001", "0195ec00-00b1-7000-8000-000000000001", "件名", "本文", []string{"demo@example.com"}); err != nil {
		t.Fatalf("enqueue mail: %v", err)
	}
	cfg := testStaffConfig()

	handler := &staffAdminHandlers{
		sharedDeps: sharedDeps{
			sessionCookieName:   "test_session",
			sessionCookieTTL:    time.Hour,
			sessionCookieSecure: false,
			staffVerifyCode:     cfg.StaffVerifyCode,
			allowDangerously:    true,
			sessions:            session.NewMemoryStore(time.Hour),
		},
		circles: circle.NewStaticCatalog(cfg.Circles, cfg.AuthUser, cfg.Users),
		mails:   mails,
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/v1/staff/mails", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("httpapi.session_id", "sid")
	c.Set("httpapi.session", session.Session{
		StaffAuthorized: true,
		User: &auth.User{
			ID:          "0195ec00-00b1-7000-8000-000000000001",
			DisplayName: "Staff User",
			Roles:       []string{"admin"},
			Permissions: []string{"staff.pages.read,edit,send_emails"},
		},
	})

	if err := handler.listStaffMails(c); err != nil {
		t.Fatalf("listStaffMails returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}

	var got []staffMailResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected one mail row, got %#v", got)
	}
	if got[0].Circle.ID != "" || got[0].Circle.Name != "" {
		t.Fatalf("expected missing circle as empty object, got %#v", got[0].Circle)
	}
}
