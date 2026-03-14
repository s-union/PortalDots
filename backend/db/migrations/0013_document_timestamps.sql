-- +goose Up
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE documents
SET updated_at = created_at
WHERE updated_at IS DISTINCT FROM created_at;

-- +goose Down
ALTER TABLE documents
    DROP COLUMN IF EXISTS updated_at;
