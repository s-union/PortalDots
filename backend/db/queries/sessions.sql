-- name: CreateSession :exec
INSERT INTO sessions (
    id,
    user_id,
    csrf_token,
    current_circle_id,
    staff_authorized,
    staff_verify_code,
    staff_verify_expires,
    reauthorized_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

-- name: GetSessionByID :one
SELECT id, user_id, csrf_token, current_circle_id, staff_authorized, staff_verify_code, staff_verify_expires, reauthorized_at, created_at, updated_at
FROM sessions
WHERE id = $1
LIMIT 1;

-- name: UpdateSession :execrows
UPDATE sessions
SET current_circle_id = CASE
        WHEN sqlc.arg(set_current_circle_id)::boolean THEN sqlc.narg(current_circle_id)::uuid
        ELSE current_circle_id
    END,
    staff_authorized = CASE
        WHEN sqlc.arg(set_staff_authorized)::boolean THEN sqlc.arg(staff_authorized)::boolean
        ELSE staff_authorized
    END,
    staff_verify_code = CASE
        WHEN sqlc.arg(set_staff_verify_code)::boolean THEN sqlc.arg(staff_verify_code)::text
        ELSE staff_verify_code
    END,
    staff_verify_expires = CASE
        WHEN sqlc.arg(set_staff_verify_expires)::boolean THEN sqlc.narg(staff_verify_expires)::timestamptz
        ELSE staff_verify_expires
    END,
    reauthorized_at = CASE
        WHEN sqlc.arg(set_reauthorized_at)::boolean THEN sqlc.narg(reauthorized_at)::timestamptz
        ELSE reauthorized_at
    END,
    updated_at = now()
WHERE id = sqlc.arg(id);

-- name: DeleteSession :exec
DELETE FROM sessions
WHERE id = $1;

-- name: DeleteSessionsByUserID :exec
DELETE FROM sessions
WHERE user_id = $1;

-- name: DeleteOtherSessionsByUserID :exec
DELETE FROM sessions
WHERE user_id = $1 AND id != $2;
