-- +goose Up
ALTER TABLE forms
    ADD COLUMN IF NOT EXISTS staff_notification_user_ids uuid[] NOT NULL DEFAULT '{}';

-- +goose Down
ALTER TABLE forms
    DROP COLUMN IF EXISTS staff_notification_user_ids;
