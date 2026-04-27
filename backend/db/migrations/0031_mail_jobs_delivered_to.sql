-- +goose Up
ALTER TABLE mail_jobs ADD COLUMN IF NOT EXISTS delivered_to text[] NOT NULL DEFAULT '{}';

-- +goose Down
ALTER TABLE mail_jobs DROP COLUMN IF EXISTS delivered_to;
