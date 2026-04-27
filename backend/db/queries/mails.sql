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

-- name: ListQueuedMailJobs :many
SELECT id, circle_id, subject, body, recipients, status, created_by_user_id, created_at, delivered_at, delivered_to
FROM mail_jobs
WHERE status = 'queued'
ORDER BY created_at ASC, id ASC
LIMIT $1;

-- name: MarkMailJobSent :one
UPDATE mail_jobs
SET status = 'sent',
    delivered_at = $2
WHERE id = $1
  AND status = 'queued'
RETURNING id, circle_id, subject, body, recipients, status, created_by_user_id, created_at, delivered_at, delivered_to;

-- name: MarkMailJobUndeliverable :one
UPDATE mail_jobs
SET status = 'undeliverable'
WHERE id = $1
  AND status = 'queued'
RETURNING id, circle_id, subject, body, recipients, status, created_by_user_id, created_at, delivered_at, delivered_to;

-- name: MarkMailJobRecipientDelivered :one
UPDATE mail_jobs
SET delivered_to = array_append(delivered_to, $2)
WHERE id = $1
  AND status = 'queued'
RETURNING id, circle_id, subject, body, recipients, status, created_by_user_id, created_at, delivered_at, delivered_to;
