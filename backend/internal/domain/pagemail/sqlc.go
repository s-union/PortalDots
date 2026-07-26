package pagemail

import (
	"context"
	"time"

	"github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

// SQLCRepository stores scheduled page mails in PostgreSQL.
type SQLCRepository struct {
	queries *db.Queries
}

// NewSQLCRepository creates a Repository backed by the given queries.
func NewSQLCRepository(queries *db.Queries) *SQLCRepository {
	return &SQLCRepository{queries: queries}
}

func (r *SQLCRepository) Schedule(ctx context.Context, pageID, jobID, actorUserID string) error {
	return r.queries.UpsertScheduledPageMail(ctx, db.UpsertScheduledPageMailParams{
		PageID:      pageID,
		JobID:       jobID,
		ActorUserID: &actorUserID,
	})
}

func (r *SQLCRepository) Unschedule(ctx context.Context, pageID string) error {
	return r.queries.DeleteScheduledPageMail(ctx, pageID)
}

func (r *SQLCRepository) HasActiveSchedule(ctx context.Context, pageID string) (bool, error) {
	return r.queries.HasActiveScheduledPageMail(ctx, pageID)
}

func (r *SQLCRepository) ClaimDue(ctx context.Context, limit int) ([]Schedule, error) {
	rows, err := r.queries.ClaimDueScheduledPageMails(ctx, int32(limit))
	if err != nil {
		return nil, err
	}

	schedules := make([]Schedule, 0, len(rows))
	for _, row := range rows {
		actorUserID := ""
		if row.ActorUserID != nil {
			actorUserID = *row.ActorUserID
		}
		schedules = append(schedules, Schedule{
			PageID:           row.PageID,
			JobID:            row.JobID,
			ActorUserID:      actorUserID,
			DispatchAttempts: int(row.DispatchAttempts),
		})
	}

	return schedules, nil
}

func (r *SQLCRepository) Release(ctx context.Context, pageID string) error {
	return r.queries.ReleaseScheduledPageMail(ctx, pageID)
}

func (r *SQLCRepository) MarkSent(ctx context.Context, pageID string) error {
	return r.queries.MarkScheduledPageMailSent(ctx, pageID)
}

func (r *SQLCRepository) MarkSkipped(ctx context.Context, pageID string) error {
	return r.queries.MarkScheduledPageMailSkipped(ctx, pageID)
}

func (r *SQLCRepository) MarkFailed(ctx context.Context, pageID string, maxAttempts int, cause string) error {
	return r.queries.MarkScheduledPageMailFailed(ctx, db.MarkScheduledPageMailFailedParams{
		MaxAttempts: int32(maxAttempts),
		LastError:   cause,
		PageID:      pageID,
	})
}

func (r *SQLCRepository) ReclaimStale(ctx context.Context, claimedBefore time.Time) (int, error) {
	reclaimed, err := r.queries.ReclaimStaleScheduledPageMails(ctx, pgutil.Timestamptz(claimedBefore))
	if err != nil {
		return 0, err
	}

	return int(reclaimed), nil
}
