package mailhistory

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/s-union/PortalDots/backend/internal/platform/postgres/pgutil"
	"github.com/s-union/PortalDots/backend/internal/shared/cloudflareemail"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Record(ctx context.Context, job cloudflareemail.EmailJob) error {
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
		entry.Priority = cloudflareemail.Priority(priority)
		entry.CreatedAt = pgutil.FormatTimestamptz(createdAt)
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}
