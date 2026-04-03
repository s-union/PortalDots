-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS circle_user (
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_leader boolean NOT NULL DEFAULT false,
    PRIMARY KEY (circle_id, user_id)
);

-- +goose Down
DROP TABLE IF EXISTS circle_user;

ALTER TABLE users
    DROP COLUMN IF EXISTS is_verified;
