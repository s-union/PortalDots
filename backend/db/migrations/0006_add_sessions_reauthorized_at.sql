-- +goose Up
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS reauthorized_at timestamptz;

-- +goose Down
ALTER TABLE sessions
    DROP COLUMN IF EXISTS reauthorized_at;
