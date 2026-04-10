-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE users
SET updated_at = created_at
WHERE updated_at IS DISTINCT FROM created_at;

-- +goose Down
ALTER TABLE users
    DROP COLUMN IF EXISTS updated_at;
