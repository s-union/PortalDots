-- name: CreateMailJob :one
INSERT INTO mail_jobs (circle_id, subject, body, recipients, created_by_user_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, circle_id, subject, body, recipients, status, created_by_user_id, created_at, delivered_at, delivered_to;

-- name: ListMailJobs :many
SELECT id, circle_id, subject, body, recipients, status, created_by_user_id, created_at, delivered_at, delivered_to
FROM mail_jobs
ORDER BY created_at DESC, id DESC;

-- name: ListMailJobsByCircle :many
SELECT id, circle_id, subject, body, recipients, status, created_by_user_id, created_at, delivered_at, delivered_to
FROM mail_jobs
WHERE circle_id = $1
ORDER BY created_at DESC, id DESC;

-- name: DeleteMailJobs :exec
DELETE FROM mail_jobs;

-- name: DeleteMailJobsByCircle :exec
DELETE FROM mail_jobs
WHERE circle_id = $1;

-- name: DeleteMailJob :exec
DELETE FROM mail_jobs
WHERE id = $1;
