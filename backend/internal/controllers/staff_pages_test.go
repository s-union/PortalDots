package controllers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
	"github.com/s-union/PortalDots/backend/internal/domain/auth"
	"github.com/s-union/PortalDots/backend/internal/domain/document"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/pagemail"
	"github.com/s-union/PortalDots/backend/internal/domain/session"
)

// An operator may edit pages without being allowed to send announcement mail.
// Such an edit must leave a pending announcement mail exactly as it is: it is
// rendered from the live page at dispatch time, so touching it would let the
// operator rewrite the body and the send time of a scheduled mass mail.
func TestUpdateStaffPageLeavesPendingMailUntouchedWithoutSendEmailsCapability(t *testing.T) {
	t.Parallel()

	pages := page.NewStaticRepository(nil)
	scheduledPageMails := pagemail.NewMemoryRepository()
	scheduledPage := pages.Create(context.Background(), "予約公開のお知らせ", "本文です。", "", true, false, nil, nil, time.Now().UTC().Add(24*time.Hour))
	if err := scheduledPageMails.Schedule(context.Background(), scheduledPage.ID, "staff-page-job", "0195ec00-0098-7000-8000-000000000001"); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	handler := &staffPageHandlers{
		sharedDeps: sharedDeps{
			sessionCookieName:   "test_session",
			sessionCookieTTL:    time.Hour,
			sessionCookieSecure: false,
			allowDangerously:    true,
			sessions:            session.NewMemoryStore(time.Hour),
		},
		activities:         activitylog.NewMemoryRepository(),
		documents:          document.NewStaticRepository(nil),
		pages:              pages,
		scheduledPageMails: scheduledPageMails,
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodPut, "/v1/staff/pages/"+scheduledPage.ID, strings.NewReader(`{
		"title": "書き換えられたタイトル",
		"body": "書き換えられた本文",
		"isPublic": true,
		"isPinned": false,
		"viewableTags": [],
		"documentIds": [],
		"sendEmails": false,
		"publishedAt": "2099-01-15T10:00:00Z"
	}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPathValues(echo.PathValues{{Name: "pageID", Value: scheduledPage.ID}})
	c.Set("httpapi.session_id", "sid")
	c.Set("httpapi.session", session.Session{
		StaffAuthorized: true,
		User: &auth.User{
			ID:          "0195ec00-0094-7000-8000-000000000001",
			DisplayName: "Content User",
			Permissions: []string{"staff.pages.read,edit"},
		},
	})

	if err := handler.updateStaffPage(c); err != nil {
		t.Fatalf("updateStaffPage returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}

	claimed, err := scheduledPageMails.ClaimDue(context.Background(), 10)
	if err != nil {
		t.Fatalf("ClaimDue() error = %v", err)
	}
	if len(claimed) != 1 || claimed[0].PageID != scheduledPage.ID || claimed[0].JobID != "staff-page-job" {
		t.Fatalf("pending announcement mail was modified: %#v", claimed)
	}
}

func TestUpdateStaffPageLeavesPendingMailUntouchedWhenSendEmailsIsOmitted(t *testing.T) {
	t.Parallel()

	pages := page.NewStaticRepository(nil)
	scheduledPageMails := pagemail.NewMemoryRepository()
	scheduledPage := pages.Create(context.Background(), "予約公開のお知らせ", "本文です。", "", true, false, nil, nil, time.Now().UTC().Add(24*time.Hour))
	if err := scheduledPageMails.Schedule(context.Background(), scheduledPage.ID, "staff-page-job", "0195ec00-0098-7000-8000-000000000001"); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	handler := &staffPageHandlers{
		sharedDeps: sharedDeps{
			sessionCookieName:   "test_session",
			sessionCookieTTL:    time.Hour,
			sessionCookieSecure: false,
			allowDangerously:    true,
			sessions:            session.NewMemoryStore(time.Hour),
		},
		activities:         activitylog.NewMemoryRepository(),
		documents:          document.NewStaticRepository(nil),
		pages:              pages,
		scheduledPageMails: scheduledPageMails,
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodPut, "/v1/staff/pages/"+scheduledPage.ID, strings.NewReader(`{
		"title": "書き換えられたタイトル",
		"body": "書き換えられた本文",
		"isPublic": true,
		"isPinned": false,
		"viewableTags": [],
		"documentIds": [],
		"publishedAt": "2099-01-15T10:00:00Z"
	}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPathValues(echo.PathValues{{Name: "pageID", Value: scheduledPage.ID}})
	c.Set("httpapi.session_id", "sid")
	c.Set("httpapi.session", session.Session{
		StaffAuthorized: true,
		User: &auth.User{
			ID:          "0195ec00-0094-7000-8000-000000000001",
			DisplayName: "Content User",
			Permissions: []string{"staff.pages.read,edit,send_emails"},
		},
	})

	if err := handler.updateStaffPage(c); err != nil {
		t.Fatalf("updateStaffPage returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}

	active, err := scheduledPageMails.HasActiveSchedule(context.Background(), scheduledPage.ID)
	if err != nil {
		t.Fatalf("HasActiveSchedule() error = %v", err)
	}
	if !active {
		t.Fatal("pending announcement mail was modified when sendEmails was omitted")
	}
}
