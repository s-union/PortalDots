-- +goose Up
CREATE TABLE IF NOT EXISTS activity_logs (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    actor_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    circle_id text NOT NULL DEFAULT '',
    summary text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx
    ON activity_logs(created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS activity_logs;
