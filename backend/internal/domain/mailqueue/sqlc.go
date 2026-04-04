package mailqueue

import (
	"context"
	"fmt"
	"time"

	dbgen "github.com/s-union/PortalDots/backend/internal/platform/postgres/db"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
)

type SQLCRepository struct {
	queries *dbgen.Queries
}

func NewSQLCRepository(queries *dbgen.Queries) *SQLCRepository {
	return &SQLCRepository{queries: queries}
}

func (r *SQLCRepository) Enqueue(ctx context.Context, circleID, createdByUserID, subject, body string, recipients []string) (Job, error) {
	row, err := r.queries.CreateMailJob(ctx, dbgen.CreateMailJobParams{
		CircleID:        pgutil.OptionalString(circleID),
		Subject:         subject,
		Body:            body,
		Recipients:      recipients,
		CreatedByUserID: createdByUserID,
	})
	if err != nil {
		return Job{}, fmt.Errorf("create mail job: %w", err)
	}

	return mapJob(row), nil
}

func (r *SQLCRepository) ListAll() []Job {
	rows, err := r.queries.ListMailJobs(context.Background())
	if err != nil {
		return nil
	}

	jobs := make([]Job, 0, len(rows))
	for _, row := range rows {
		jobs = append(jobs, mapJob(row))
	}

	return jobs
}

func (r *SQLCRepository) ListByCircle(circleID string) []Job {
	rows, err := r.queries.ListMailJobsByCircle(context.Background(), pgutil.OptionalString(circleID))
	if err != nil {
		return nil
	}

	jobs := make([]Job, 0, len(rows))
	for _, row := range rows {
		jobs = append(jobs, mapJob(row))
	}

	return jobs
}

func (r *SQLCRepository) ListQueued(limit int) []Job {
	rows, err := r.queries.ListQueuedMailJobs(context.Background(), int32(limit))
	if err != nil {
		return nil
	}

	jobs := make([]Job, 0, len(rows))
	for _, row := range rows {
		jobs = append(jobs, mapJob(row))
	}

	return jobs
}

func (r *SQLCRepository) MarkSent(id string, deliveredAt time.Time) bool {
	_, err := r.queries.MarkMailJobSent(context.Background(), dbgen.MarkMailJobSentParams{
		ID:          id,
		DeliveredAt: pgutil.Timestamptz(deliveredAt.UTC()),
	})

	return err == nil
}

func (r *SQLCRepository) DeleteByCircle(circleID string) {
	_ = r.queries.DeleteMailJobsByCircle(context.Background(), pgutil.OptionalString(circleID))
}

func (r *SQLCRepository) DeleteAll() {
	_ = r.queries.DeleteMailJobs(context.Background())
}

func mapJob(row dbgen.MailJob) Job {
	job := Job{
		ID:              row.ID,
		CircleID:        pgutil.DerefString(row.CircleID),
		Subject:         row.Subject,
		Body:            row.Body,
		Recipients:      row.Recipients,
		Status:          row.Status,
		CreatedByUserID: row.CreatedByUserID,
		CreatedAt:       pgutil.FormatTimestamptz(row.CreatedAt),
	}
	if row.DeliveredAt.Valid {
		job.DeliveredAt = pgutil.FormatTimestamptz(row.DeliveredAt)
	}

	return job
}
