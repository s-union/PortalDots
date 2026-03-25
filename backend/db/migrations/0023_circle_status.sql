-- +goose Up
ALTER TABLE circles
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS status_reason text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS status_set_at timestamptz,
    ADD COLUMN IF NOT EXISTS status_set_by text REFERENCES users(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE circles
    DROP COLUMN IF EXISTS status_set_by,
    DROP COLUMN IF EXISTS status_set_at,
    DROP COLUMN IF EXISTS status_reason,
    DROP COLUMN IF EXISTS status;
