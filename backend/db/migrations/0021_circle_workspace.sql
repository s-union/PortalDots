-- +goose Up
ALTER TABLE circles
    ADD COLUMN IF NOT EXISTS name_yomi text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS group_name_yomi text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS invitation_token text UNIQUE,
    ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
    ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE circles
    DROP COLUMN IF EXISTS notes,
    DROP COLUMN IF EXISTS submitted_at,
    DROP COLUMN IF EXISTS invitation_token,
    DROP COLUMN IF EXISTS group_name_yomi,
    DROP COLUMN IF EXISTS name_yomi;
