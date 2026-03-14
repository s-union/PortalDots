-- +goose Up
ALTER TABLE forms
    ADD COLUMN IF NOT EXISTS max_answers integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS answerable_tags text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS confirmation_message text NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE forms
    DROP COLUMN IF EXISTS confirmation_message,
    DROP COLUMN IF EXISTS answerable_tags,
    DROP COLUMN IF EXISTS max_answers;
