-- +goose Up
ALTER TABLE forms
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE forms
SET updated_at = created_at
WHERE updated_at IS DISTINCT FROM created_at;

-- +goose Down
ALTER TABLE forms
    DROP COLUMN IF EXISTS updated_at;
