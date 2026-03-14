-- +goose Up
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_important boolean NOT NULL DEFAULT false;

-- +goose Down
ALTER TABLE documents
    DROP COLUMN IF EXISTS is_important,
    DROP COLUMN IF EXISTS notes;
