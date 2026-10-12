package mailhistory

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
	"github.com/s-union/PortalDots/backend/internal/shared/emailqueue"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Record(ctx context.Context, job emailqueue.EmailJob) error {
	_, err := r.pool.Exec(ctx, `
INSERT INTO outbound_mails (
    job_id,
    template,
    priority,
    from_address,
    subject,
    body,
    recipients
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
)
ON CONFLICT (job_id) DO NOTHING
`,
		job.JobId,
		job.Template,
		string(job.Priority),
		job.From,
		job.Subject,
		job.Body,
		job.To,
	)
	return err
}

func (r *PostgresRepository) List(ctx context.Context) ([]Entry, error) {
	rows, err := r.pool.Query(ctx, `
SELECT job_id, template, priority, from_address, subject, body, recipients, created_at
FROM outbound_mails
ORDER BY created_at DESC, job_id DESC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return readEntries(rows)
}

func (r *PostgresRepository) ListPage(ctx context.Context, limit int, cursor string) (Page, error) {
	before, err := decodeCursor(cursor)
	if err != nil {
		return Page{}, err
	}
	query := `SELECT job_id, template, priority, from_address, subject, body, recipients, created_at FROM outbound_mails`
	args := []any{limit + 1}
	if before != nil {
		query += ` WHERE (created_at, job_id) < ($2, $3)`
		args = append(args, before.CreatedAt, before.JobID)
	}
	query += ` ORDER BY created_at DESC, job_id DESC LIMIT $1`
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return Page{}, err
	}
	defer rows.Close()
	entries, err := readEntries(rows)
	if err != nil {
		return Page{}, err
	}
	return buildPage(entries, limit)
}

func (r *PostgresRepository) ListContactHistory(ctx context.Context, userID, circleID string) ([]Entry, error) {
	// Legacy contacts identify their owner in the structured header, never the free-form body.
	rows, err := r.pool.Query(ctx, `
SELECT job_id, template, priority, from_address, subject,
       split_part(body, E'\n\n', 1), NULL::text[], created_at
FROM outbound_mails
WHERE job_id NOT LIKE 'contact-confirm-%'
  AND contact_user_ids @> ARRAY[$1]::text[]
  AND contact_circle_ids @> ARRAY[$2]::text[]
ORDER BY created_at DESC, job_id DESC
`, userID, circleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return readEntries(rows)
}

func readEntries(rows pgx.Rows) ([]Entry, error) {
	entries := []Entry{}
	for rows.Next() {
		var entry Entry
		var priority string
		var createdAt pgtype.Timestamptz
		if err := rows.Scan(
			&entry.JobID,
			&entry.Template,
			&priority,
			&entry.From,
			&entry.Subject,
			&entry.Body,
			&entry.Recipients,
			&createdAt,
		); err != nil {
			return nil, err
		}
		entry.Priority = emailqueue.Priority(priority)
		entry.CreatedAt = pgutil.FormatTimestamptz(createdAt)
		entry.createdAt = createdAt.Time.UTC()
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

func (r *PostgresRepository) Delete(ctx context.Context, jobID string) error {
	_, err := r.pool.Exec(ctx, `
DELETE FROM outbound_mails
WHERE job_id = $1
`, jobID)
	return err
}
