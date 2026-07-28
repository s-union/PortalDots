package pagemail

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
	"github.com/s-union/PortalDots/backend/internal/domain/circle"
	"github.com/s-union/PortalDots/backend/internal/domain/document"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/domain/participationtype"
	"github.com/s-union/PortalDots/backend/internal/domain/useradmin"
	"github.com/s-union/PortalDots/backend/internal/platform/config"
	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
)

const testActorUserID = "0195ec00-0098-7000-8000-000000000001"

type fakeSender struct {
	err  error
	jobs []emailqueue.EmailJob
}

func (s *fakeSender) Enqueue(_ context.Context, job emailqueue.EmailJob) error {
	if s.err != nil {
		return s.err
	}
	s.jobs = append(s.jobs, job)

	return nil
}

func TestTickDispatchesDuePage(t *testing.T) {
	t.Parallel()

	pages, schedules, sender, activities, dispatcher := newTestDispatcher(t)
	duePage := pages.Create(context.Background(), "公開のお知らせ", "本文です。", "", true, false, nil, nil, time.Now().UTC().Add(-time.Minute))
	if err := schedules.Schedule(context.Background(), duePage.ID, "job-1", testActorUserID); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	if err := dispatcher.Tick(context.Background()); err != nil {
		t.Fatalf("Tick() error = %v", err)
	}

	if len(sender.jobs) != 1 {
		t.Fatalf("enqueued %d jobs, want 1", len(sender.jobs))
	}
	if sender.jobs[0].JobId != "job-1" || sender.jobs[0].Subject != duePage.Title {
		t.Fatalf("unexpected job: %#v", sender.jobs[0])
	}
	if len(sender.jobs[0].To) != 1 || sender.jobs[0].To[0] != "member@example.com" {
		t.Fatalf("unexpected recipients: %#v", sender.jobs[0].To)
	}
	if status := scheduleStatus(t, schedules, duePage.ID); status != "sent" {
		t.Fatalf("schedule status = %q, want sent", status)
	}

	entries, err := activities.List(context.Background())
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(entries) != 1 || entries[0].ActorUserID != testActorUserID || entries[0].Action != "staff.mail.queued" {
		t.Fatalf("unexpected activity entries: %#v", entries)
	}
}

func TestTickReleasesPageThatIsNoLongerDue(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		isPublic    bool
		publishedAt time.Time
	}{
		{name: "unpublished", isPublic: false, publishedAt: time.Now().UTC().Add(-time.Minute)},
		{name: "rescheduled into the future", isPublic: true, publishedAt: time.Now().UTC().Add(time.Hour)},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			pages, schedules, sender, _, dispatcher := newTestDispatcher(t)
			hiddenPage := pages.Create(context.Background(), "非公開のお知らせ", "本文です。", "", testCase.isPublic, false, nil, nil, testCase.publishedAt)
			if err := schedules.Schedule(context.Background(), hiddenPage.ID, "job-1", testActorUserID); err != nil {
				t.Fatalf("Schedule() error = %v", err)
			}

			if err := dispatcher.Tick(context.Background()); err != nil {
				t.Fatalf("Tick() error = %v", err)
			}

			if len(sender.jobs) != 0 {
				t.Fatalf("enqueued %d jobs, want 0", len(sender.jobs))
			}
			if status := scheduleStatus(t, schedules, hiddenPage.ID); status != "pending" {
				t.Fatalf("schedule status = %q, want pending", status)
			}
		})
	}
}

func TestTickUnschedulesDeletedPage(t *testing.T) {
	t.Parallel()

	_, schedules, sender, _, dispatcher := newTestDispatcher(t)
	deletedPageID := "0195ec00-0031-7000-8000-000000000001"
	if err := schedules.Schedule(context.Background(), deletedPageID, "job-1", testActorUserID); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	if err := dispatcher.Tick(context.Background()); err != nil {
		t.Fatalf("Tick() error = %v", err)
	}

	if len(sender.jobs) != 0 {
		t.Fatalf("enqueued %d jobs, want 0", len(sender.jobs))
	}
	if _, found := schedules.entries[deletedPageID]; found {
		t.Fatal("expected the schedule of a deleted page to be dropped")
	}
}

func TestTickGivesUpAfterRepeatedEnqueueFailures(t *testing.T) {
	t.Parallel()

	pages, schedules, sender, _, dispatcher := newTestDispatcher(t)
	sender.err = errors.New("email producer is unreachable")
	duePage := pages.Create(context.Background(), "公開のお知らせ", "本文です。", "", true, false, nil, nil, time.Now().UTC().Add(-time.Minute))
	if err := schedules.Schedule(context.Background(), duePage.ID, "job-1", testActorUserID); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	for attempt := 1; attempt < defaultMaxAttempts; attempt++ {
		makeRetryDue(schedules, duePage.ID)
		if err := dispatcher.Tick(context.Background()); err == nil {
			t.Fatalf("Tick() attempt %d error = nil, want the enqueue failure", attempt)
		}
		if status := scheduleStatus(t, schedules, duePage.ID); status != "pending" {
			t.Fatalf("schedule status after attempt %d = %q, want pending", attempt, status)
		}
	}

	makeRetryDue(schedules, duePage.ID)
	if err := dispatcher.Tick(context.Background()); err == nil {
		t.Fatal("Tick() on the last attempt error = nil, want the enqueue failure")
	}
	if status := scheduleStatus(t, schedules, duePage.ID); status != "failed" {
		t.Fatalf("schedule status = %q, want failed", status)
	}

	// A mail that gave up must not be picked up again.
	sender.err = nil
	if err := dispatcher.Tick(context.Background()); err != nil {
		t.Fatalf("Tick() error = %v", err)
	}
	if len(sender.jobs) != 0 {
		t.Fatalf("enqueued %d jobs after giving up, want 0", len(sender.jobs))
	}
}

func TestTickStopsRetryingPageThatReachesNobody(t *testing.T) {
	t.Parallel()

	pages, schedules, sender, _, dispatcher := newTestDispatcher(t)
	// No circle carries this tag, so the mail has no recipients at all.
	duePage := pages.Create(context.Background(), "限定公開のお知らせ", "本文です。", "", true, false, []string{"展示"}, nil, time.Now().UTC().Add(-time.Minute))
	if err := schedules.Schedule(context.Background(), duePage.ID, "job-1", testActorUserID); err != nil {
		t.Fatalf("Schedule() error = %v", err)
	}

	if err := dispatcher.Tick(context.Background()); err != nil {
		t.Fatalf("Tick() error = %v", err)
	}
	if err := dispatcher.Tick(context.Background()); err != nil {
		t.Fatalf("Tick() error = %v", err)
	}

	if len(sender.jobs) != 0 {
		t.Fatalf("enqueued %d jobs, want 0", len(sender.jobs))
	}
	if status := scheduleStatus(t, schedules, duePage.ID); status != "skipped" {
		t.Fatalf("schedule status = %q, want skipped", status)
	}
	if err := schedules.Schedule(context.Background(), duePage.ID, "job-2", testActorUserID); err != nil {
		t.Fatalf("Schedule() after skipped mail error = %v", err)
	}
	if status := scheduleStatus(t, schedules, duePage.ID); status != "pending" {
		t.Fatalf("rescheduled status = %q, want pending", status)
	}
}

func makeRetryDue(schedules *MemoryRepository, pageID string) {
	schedules.mu.Lock()
	defer schedules.mu.Unlock()
	schedules.entries[pageID].nextAttemptAt = time.Time{}
}

func newTestDispatcher(t *testing.T) (
	*page.StaticRepository,
	*MemoryRepository,
	*fakeSender,
	*activitylog.MemoryRepository,
	*Dispatcher,
) {
	t.Helper()

	member := config.AuthUser{
		ID:          "0195ec00-0057-7000-8000-000000000001",
		LoginIDs:    []string{"member@example.com"},
		DisplayName: "Member",
	}
	builder := NewBuilder(
		circle.NewStaticCatalog(nil, member, nil),
		document.NewStaticRepository(nil),
		participationtype.NewMemoryRepository(nil),
		useradmin.NewStaticRepository(member, nil),
		MailConfig{
			From:         "noreply@example.com",
			AdminName:    "PortalDots 実行委員会",
			ContactEmail: "contact@example.com",
			AppName:      "PortalDots",
			AppURL:       "https://portal.example.com",
		},
	)

	pages := page.NewStaticRepository(nil)
	schedules := NewMemoryRepository()
	sender := &fakeSender{}
	activities := activitylog.NewMemoryRepository()

	return pages, schedules, sender, activities,
		NewDispatcher(schedules, pages, builder, sender, activities, time.Minute)
}

func scheduleStatus(t *testing.T, schedules *MemoryRepository, pageID string) string {
	t.Helper()

	entry, found := schedules.entries[pageID]
	if !found {
		t.Fatalf("no schedule recorded for page %q", pageID)
	}

	return entry.status
}
