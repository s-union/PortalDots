-- +goose Up
CREATE TABLE IF NOT EXISTS pending_registrations (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    univemail text NOT NULL,
    student_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pending_registrations_univemail_lower_unique_idx
    ON pending_registrations (lower(univemail));

CREATE INDEX IF NOT EXISTS pending_registrations_expires_at_idx
    ON pending_registrations (expires_at);

-- +goose Down
DROP TABLE IF EXISTS pending_registrations;
