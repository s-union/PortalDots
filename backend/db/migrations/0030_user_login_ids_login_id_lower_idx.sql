-- +goose Up
CREATE INDEX IF NOT EXISTS user_login_ids_login_id_lower_idx
    ON user_login_ids (lower(login_id));

-- +goose Down
DROP INDEX IF EXISTS user_login_ids_login_id_lower_idx;
