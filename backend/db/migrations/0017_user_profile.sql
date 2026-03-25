-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS last_name_reading text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS first_name_reading text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS phone_number text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_email_verified boolean NOT NULL DEFAULT false;

-- +goose Down
ALTER TABLE users
    DROP COLUMN IF EXISTS last_name,
    DROP COLUMN IF EXISTS last_name_reading,
    DROP COLUMN IF EXISTS first_name,
    DROP COLUMN IF EXISTS first_name_reading,
    DROP COLUMN IF EXISTS contact_email,
    DROP COLUMN IF EXISTS phone_number,
    DROP COLUMN IF EXISTS is_email_verified;
