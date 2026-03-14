CREATE TABLE IF NOT EXISTS user_permissions (
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, permission)
);

CREATE INDEX IF NOT EXISTS user_permissions_permission_idx
    ON user_permissions (permission);
