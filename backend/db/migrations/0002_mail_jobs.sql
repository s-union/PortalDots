-- +goose Up
CREATE TABLE IF NOT EXISTS mail_jobs (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    circle_id text NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    subject text NOT NULL,
    body text NOT NULL,
    recipients text[] NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    created_by_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS mail_jobs_circle_id_created_at_idx
    ON mail_jobs(circle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mail_jobs_status_created_at_idx
    ON mail_jobs(status, created_at ASC);

-- +goose Down
DROP TABLE IF EXISTS mail_jobs;
