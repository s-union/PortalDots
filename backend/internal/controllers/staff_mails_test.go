package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/mailhistory"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

func TestListStaffMailsReturnsEmptyWhenNoProducer(t *testing.T) {
	t.Parallel()

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
		circles:     circle.NewStaticCatalog(cfg.Circles, cfg.AuthUser, cfg.Users),
		emailSender: cloudflareemail.NewNoopSender(),
		mailHistory: mailhistory.NewMemoryRepository(),
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
	if len(got) != 0 {
		t.Fatalf("expected empty array, got %#v", got)
	}
}

func TestListStaffMailsRejectsNonAdminStaff(t *testing.T) {
	t.Parallel()

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
		circles:     circle.NewStaticCatalog(cfg.Circles, cfg.AuthUser, cfg.Users),
		emailSender: cloudflareemail.NewNoopSender(),
		mailHistory: mailhistory.NewMemoryRepository(),
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
			DisplayName: "Content User",
			Roles:       []string{"content_manager"},
			Permissions: []string{"staff.pages.read,edit,send_emails"},
		},
	})

	if err := handler.listStaffMails(c); err != nil {
		t.Fatalf("listStaffMails returned error: %v", err)
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusForbidden, rec.Code, rec.Body.String())
	}
}

func TestEnqueueStaffMailSucceedsWithNoopSenderWhenNoProducer(t *testing.T) {
	t.Parallel()

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
		activities:  activitylog.NewMemoryRepository(),
		circles:     circle.NewStaticCatalog(cfg.Circles, cfg.AuthUser, cfg.Users),
		emailSender: cloudflareemail.NewNoopSender(),
		mailHistory: mailhistory.NewMemoryRepository(),
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/v1/staff/mails", strings.NewReader(`{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
		"subject": "件名",
		"body": "本文",
		"recipients": ["demo@example.com"]
	}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("httpapi.session_id", "sid")
	c.Set("httpapi.session", session.Session{
		StaffAuthorized: true,
		User: &auth.User{
			ID:          "0195ec00-00b1-7000-8000-000000000001",
			DisplayName: "Staff User",
			Roles:       []string{"admin"},
			Permissions: []string{"staff.mailQueue.use"},
		},
	})

	if err := handler.enqueueStaffMail(c); err != nil {
		t.Fatalf("enqueueStaffMail returned error: %v", err)
	}
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusCreated, rec.Code, rec.Body.String())
	}

	var got staffMailResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if got.JobId == "" {
		t.Fatal("expected jobId to be populated")
	}
	if got.Subject != "件名" || got.Body != "本文" || got.Priority != string(cloudflareemail.PriorityNormal) || len(got.Recipients) != 1 || got.Recipients[0] != "demo@example.com" || got.CreatedAt == "" {
		t.Fatalf("unexpected response: %#v", got)
	}
}

func TestEnqueueStaffMailRejectsNonAdminStaff(t *testing.T) {
	t.Parallel()

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
		activities:  activitylog.NewMemoryRepository(),
		circles:     circle.NewStaticCatalog(cfg.Circles, cfg.AuthUser, cfg.Users),
		emailSender: cloudflareemail.NewNoopSender(),
		mailHistory: mailhistory.NewMemoryRepository(),
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/v1/staff/mails", strings.NewReader(`{
		"circleId": "0195ec00-0021-7000-8000-000000000001",
		"subject": "件名",
		"body": "本文",
		"recipients": ["demo@example.com"]
	}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("httpapi.session_id", "sid")
	c.Set("httpapi.session", session.Session{
		StaffAuthorized: true,
		User: &auth.User{
			ID:          "0195ec00-00b1-7000-8000-000000000001",
			DisplayName: "Content User",
			Roles:       []string{"content_manager"},
			Permissions: []string{"staff.pages.read,edit,send_emails"},
		},
	})

	if err := handler.enqueueStaffMail(c); err != nil {
		t.Fatalf("enqueueStaffMail returned error: %v", err)
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusForbidden, rec.Code, rec.Body.String())
	}
}
