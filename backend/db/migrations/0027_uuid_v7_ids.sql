-- +goose Up
-- Fresh databases now start with UUIDv7-backed entity IDs from the base migrations.
-- This migration remains as a numbered placeholder so existing task/docs references stay valid.
SELECT 1;

-- +goose Down
SELECT 1;
