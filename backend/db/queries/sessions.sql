-- name: CreateSession :exec
INSERT INTO sessions (
    id,
    user_id,
    csrf_token,
    current_circle_id,
    staff_authorized,
    staff_verify_code,
    staff_verify_expires
)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: GetSessionByID :one
SELECT id, user_id, csrf_token, current_circle_id, staff_authorized, staff_verify_code, staff_verify_expires, created_at, updated_at
FROM sessions
WHERE id = $1
LIMIT 1;

-- name: UpdateSession :exec
UPDATE sessions
SET current_circle_id = $2,
    staff_authorized = $3,
    staff_verify_code = $4,
    staff_verify_expires = $5,
    updated_at = now()
WHERE id = $1;

-- name: DeleteSession :exec
DELETE FROM sessions
WHERE id = $1;

-- name: DeleteSessionsByUserID :exec
DELETE FROM sessions
WHERE user_id = $1;

-- name: DeleteOtherSessionsByUserID :exec
DELETE FROM sessions
WHERE user_id = $1 AND id != $2;
