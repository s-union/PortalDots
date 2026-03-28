-- name: CreatePendingRegistration :one
INSERT INTO pending_registrations (
    univemail,
    student_id,
    token_hash,
    expires_at
)
VALUES ($1, $2, $3, $4)
RETURNING id, univemail, student_id, token_hash, expires_at, verified_at, created_at, updated_at;

-- name: GetPendingRegistrationByID :one
SELECT id, univemail, student_id, token_hash, expires_at, verified_at, created_at, updated_at
FROM pending_registrations
WHERE id = $1
LIMIT 1;

-- name: GetPendingRegistrationByUnivemail :one
SELECT id, univemail, student_id, token_hash, expires_at, verified_at, created_at, updated_at
FROM pending_registrations
WHERE lower(univemail) = lower($1)
LIMIT 1;

-- name: UpdatePendingRegistrationByID :one
UPDATE pending_registrations
SET student_id = $2,
    token_hash = $3,
    expires_at = $4,
    verified_at = NULL,
    updated_at = now()
WHERE id = $1
RETURNING id, univemail, student_id, token_hash, expires_at, verified_at, created_at, updated_at;

-- name: MarkPendingRegistrationVerified :one
UPDATE pending_registrations
SET verified_at = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, univemail, student_id, token_hash, expires_at, verified_at, created_at, updated_at;

-- name: DeletePendingRegistration :execrows
DELETE FROM pending_registrations
WHERE id = $1;

-- name: DeleteExpiredPendingRegistrations :execrows
DELETE FROM pending_registrations
WHERE expires_at <= $1;
