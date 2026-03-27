-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_univemail_verified boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS users_contact_email_lower_unique_idx
    ON users (lower(contact_email))
    WHERE contact_email <> '';

ALTER TABLE circles
    ADD COLUMN IF NOT EXISTS can_change_group_name boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- +goose Down
ALTER TABLE circles
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS can_change_group_name;

DROP INDEX IF EXISTS users_contact_email_lower_unique_idx;

ALTER TABLE users
    DROP COLUMN IF EXISTS is_univemail_verified;
