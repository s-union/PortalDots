-- name: AddFormsCreatedByUserID :exec
ALTER TABLE forms
    ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
