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

// An operator without mail permission cannot edit fields that affect a pending
// announcement mail rendered from the live page at dispatch time.
func TestUpdateStaffPageRejectsPendingMailChangeWithoutSendEmailsCapability(t *testing.T) {
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
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusForbidden, rec.Code, rec.Body.String())
	}
	current, found := pages.FindForStaff(context.Background(), scheduledPage.ID)
	if !found || current.Title != scheduledPage.Title || current.Body != scheduledPage.Body {
		t.Fatalf("pending page was modified: %#v", current)
	}

	claimed, err := scheduledPageMails.ClaimDue(context.Background(), 10)
	if err != nil {
		t.Fatalf("ClaimDue() error = %v", err)
	}
	if len(claimed) != 1 || claimed[0].PageID != scheduledPage.ID || claimed[0].JobID != "staff-page-job" {
		t.Fatalf("pending announcement mail was modified: %#v", claimed)
	}
}

func TestUpdateStaffPageRequiresFreshApprovalForPendingMailChange(t *testing.T) {
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
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusUnprocessableEntity, rec.Code, rec.Body.String())
	}

	active, err := scheduledPageMails.HasActiveSchedule(context.Background(), scheduledPage.ID)
	if err != nil {
		t.Fatalf("HasActiveSchedule() error = %v", err)
	}
	if !active {
		t.Fatal("pending announcement mail was modified when sendEmails was omitted")
	}
}

// alwaysMissingPageRepository simulates the page having disappeared between
// the handler's initial lookup and its call to Update (e.g. a concurrent
// deletion), so Update always reports the page as not found.
type alwaysMissingPageRepository struct {
	*page.StaticRepository
}

func (r *alwaysMissingPageRepository) Update(_ context.Context, _, _, _, _ string, _, _ bool, _, _ []string, _ time.Time) (page.Page, bool) {
	return page.Page{}, false
}

// scheduleCountingPageMailRepository counts Schedule calls so a test can
// assert the mail schedule was never touched before a page update is known
// to have succeeded.
type scheduleCountingPageMailRepository struct {
	*pagemail.MemoryRepository
	scheduleCalls int
}

func (r *scheduleCountingPageMailRepository) Schedule(ctx context.Context, pageID, jobID, actorUserID string) error {
	r.scheduleCalls++
	return r.MemoryRepository.Schedule(ctx, pageID, jobID, actorUserID)
}

// TestUpdateStaffPageDoesNotScheduleMailBeforeUpdateSucceeds reproduces a page
// update that fails after the mail-scheduling decision has been made. The
// sendEmails=true case must not touch the mail schedule until the page update
// is known to have succeeded, otherwise a schedule survives for content that
// was never persisted.
func TestUpdateStaffPageDoesNotScheduleMailBeforeUpdateSucceeds(t *testing.T) {
	t.Parallel()

	underlyingPages := page.NewStaticRepository(nil)
	scheduledPage := underlyingPages.Create(context.Background(), "予約公開のお知らせ", "本文です。", "", true, false, nil, nil, time.Now().UTC().Add(24*time.Hour))
	scheduledPageMails := &scheduleCountingPageMailRepository{MemoryRepository: pagemail.NewMemoryRepository()}
	if err := scheduledPageMails.Schedule(context.Background(), scheduledPage.ID, "staff-page-job", "0195ec00-0098-7000-8000-000000000001"); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}
	scheduledPageMails.scheduleCalls = 0 // ignore the seed call above

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
		pages:              &alwaysMissingPageRepository{StaticRepository: underlyingPages},
		scheduledPageMails: scheduledPageMails,
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodPut, "/v1/staff/pages/"+scheduledPage.ID, strings.NewReader(`{
		"title": "再承認されたタイトル",
		"body": "再承認された本文",
		"isPublic": true,
		"isPinned": false,
		"viewableTags": [],
		"documentIds": [],
		"sendEmails": true,
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
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusNotFound, rec.Code, rec.Body.String())
	}
	if scheduledPageMails.scheduleCalls != 0 {
		t.Fatalf("schedulePageMail must not run before the page update is known to succeed, got %d calls", scheduledPageMails.scheduleCalls)
	}
}

func TestUpdateStaffPageAcceptsFreshApprovalForPendingMailChange(t *testing.T) {
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
		"title": "再承認されたタイトル",
		"body": "再承認された本文",
		"isPublic": true,
		"isPinned": false,
		"viewableTags": [],
		"documentIds": [],
		"sendEmails": true,
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
	current, found := pages.FindForStaff(context.Background(), scheduledPage.ID)
	if !found || current.Title != "再承認されたタイトル" || current.Body != "再承認された本文" {
		t.Fatalf("freshly approved page was not updated: %#v", current)
	}
	active, err := scheduledPageMails.HasActiveSchedule(context.Background(), scheduledPage.ID)
	if err != nil {
		t.Fatalf("HasActiveSchedule() error = %v", err)
	}
	if !active {
		t.Fatal("freshly approved announcement mail is not scheduled")
	}
}
