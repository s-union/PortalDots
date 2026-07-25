-- +goose Up
CREATE TABLE scheduled_page_mails (
    page_id uuid PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
    job_id text NOT NULL,
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatching', 'sent', 'failed')),
    dispatch_attempts integer NOT NULL DEFAULT 0,
    last_error text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    dispatched_at timestamptz
);

CREATE INDEX scheduled_page_mails_status_updated_at_idx
    ON scheduled_page_mails(status, updated_at);

-- +goose Down
DROP TABLE IF EXISTS scheduled_page_mails;
