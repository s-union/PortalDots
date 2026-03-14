-- +goose Up
ALTER TABLE circles
    ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE pages
    ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS viewable_tags text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS document_ids text[] NOT NULL DEFAULT '{}';

-- +goose Down
ALTER TABLE pages
    DROP COLUMN IF EXISTS document_ids,
    DROP COLUMN IF EXISTS viewable_tags,
    DROP COLUMN IF EXISTS notes;

ALTER TABLE circles
    DROP COLUMN IF EXISTS tags;
