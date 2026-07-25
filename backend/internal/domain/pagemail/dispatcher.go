package pagemail

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/s-union/PortalDots/backend/internal/domain/activitylog"
	"github.com/s-union/PortalDots/backend/internal/domain/page"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

const (
	// defaultBatchSize bounds how many mails one tick dispatches.
	defaultBatchSize = 50
	// defaultMaxAttempts gives up on a mail that keeps failing, so that a
	// permanently broken row cannot occupy the batch and starve later mail.
	defaultMaxAttempts = 5
	// defaultStaleAfter reclaims mails left behind by a process that died
	// between claiming and dispatching.
	defaultStaleAfter = 10 * time.Minute
)

// Dispatcher sends the announcement email of pages whose publish time has come.
type Dispatcher struct {
	schedules  Repository
	pages      page.Repository
	builder    *Builder
	sender     cloudflareemail.Sender
	activities activitylog.Repository
	interval   time.Duration
	now        func() time.Time
}

// NewDispatcher creates a Dispatcher running one pass every interval.
func NewDispatcher(
	schedules Repository,
	pages page.Repository,
	builder *Builder,
	sender cloudflareemail.Sender,
	activities activitylog.Repository,
	interval time.Duration,
) *Dispatcher {
	return &Dispatcher{
		schedules:  schedules,
		pages:      pages,
		builder:    builder,
		sender:     sender,
		activities: activities,
		interval:   interval,
		now:        time.Now,
	}
}

// Run dispatches due mail until the context is cancelled.
func (d *Dispatcher) Run(ctx context.Context) {
	ticker := time.NewTicker(d.interval)
	defer ticker.Stop()

	slog.Info("scheduled page mail dispatcher started", "interval", d.interval)
	for {
		select {
		case <-ctx.Done():
			slog.Info("scheduled page mail dispatcher stopped")
			return
		case <-ticker.C:
			if err := d.Tick(ctx); err != nil {
				// A failing tick must not stop the loop; the next one retries.
				slog.Error("scheduled page mail dispatch failed", "error", err)
			}
		}
	}
}

// Tick dispatches one batch of due mail. It is exported so that it can be
// driven synchronously from tests.
func (d *Dispatcher) Tick(ctx context.Context) error {
	if reclaimed, err := d.schedules.ReclaimStale(ctx, d.now().Add(-defaultStaleAfter)); err != nil {
		return err
	} else if reclaimed > 0 {
		slog.Warn("reclaimed stale scheduled page mails", "count", reclaimed)
	}

	claimed, err := d.schedules.ClaimDue(ctx, defaultBatchSize)
	if err != nil {
		return err
	}

	var errs []error
	for _, schedule := range claimed {
		if err := d.dispatch(ctx, schedule); err != nil {
			errs = append(errs, err)
		}
	}

	return errors.Join(errs...)
}

func (d *Dispatcher) dispatch(ctx context.Context, schedule Schedule) error {
	currentPage, found := d.pages.FindForStaff(ctx, schedule.PageID)
	if !found {
		// The page is gone. In PostgreSQL the foreign key has already removed
		// the row; this only covers repositories without that guarantee. The
		// claim is released first because unscheduling deliberately spares a
		// mail that is being dispatched.
		if err := d.schedules.Release(ctx, schedule.PageID); err != nil {
			return err
		}

		return d.schedules.Unschedule(ctx, schedule.PageID)
	}
	if !isDue(currentPage, d.now()) {
		// The page was unpublished or rescheduled after the claim.
		return d.schedules.Release(ctx, schedule.PageID)
	}

	job, err := d.builder.Build(ctx, currentPage, schedule.JobID)
	if err != nil {
		// The recipients could not be determined; this says nothing about
		// whether the mail should be sent, so retry rather than give up.
		return d.fail(ctx, schedule, err)
	}
	if len(job.To) == 0 {
		slog.Info("scheduled page mail reaches nobody", "page_id", schedule.PageID)
		return d.schedules.MarkSent(ctx, schedule.PageID)
	}

	if err := d.sender.Enqueue(ctx, job); err != nil {
		return d.fail(ctx, schedule, err)
	}

	if err := d.schedules.MarkSent(ctx, schedule.PageID); err != nil {
		// The mail is already on its way. Leaving the row claimed would make
		// the stale reclaim resend it, but the job ID is stable so the mail
		// worker rejects the repeat.
		return err
	}

	slog.Info("scheduled page mail dispatched",
		"page_id", schedule.PageID, "job_id", schedule.JobID, "recipients", len(job.To))
	if d.activities != nil && schedule.ActorUserID != "" {
		if err := d.activities.Record(ctx, schedule.ActorUserID, "staff.mail.queued", "mail_job", schedule.JobID, "",
			"予約されたページのお知らせメールを配信しました: "+currentPage.Title); err != nil {
			slog.Error("failed to record scheduled page mail activity", "page_id", schedule.PageID, "error", err)
		}
	}

	return nil
}

func (d *Dispatcher) fail(ctx context.Context, schedule Schedule, cause error) error {
	slog.Error("failed to dispatch scheduled page mail",
		"page_id", schedule.PageID, "attempts", schedule.DispatchAttempts+1, "error", cause)
	if err := d.schedules.MarkFailed(ctx, schedule.PageID, defaultMaxAttempts, cause.Error()); err != nil {
		return errors.Join(cause, err)
	}

	return cause
}

// isDue reports whether the page is publicly visible, which is exactly when its
// announcement email may go out.
func isDue(currentPage page.Page, now time.Time) bool {
	if !currentPage.IsPublic {
		return false
	}
	publishedAt, err := time.Parse(time.RFC3339, currentPage.PublishedAt)
	if err != nil {
		// An unreadable publish time must not release mail early.
		return false
	}

	return !publishedAt.After(now)
}
