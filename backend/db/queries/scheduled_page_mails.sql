-- name: UpsertScheduledPageMail :exec
INSERT INTO scheduled_page_mails (page_id, job_id, actor_user_id)
VALUES ($1, $2, $3)
ON CONFLICT (page_id) DO UPDATE
SET actor_user_id = EXCLUDED.actor_user_id,
    job_id = CASE
        WHEN scheduled_page_mails.status IN ('sent', 'skipped') THEN EXCLUDED.job_id
        ELSE scheduled_page_mails.job_id
    END,
    status = 'pending',
    dispatch_attempts = 0,
    last_error = '',
    next_attempt_at = now(),
    updated_at = now()
WHERE scheduled_page_mails.status IN ('pending', 'failed', 'sent', 'skipped');

-- name: DeleteScheduledPageMail :exec
DELETE FROM scheduled_page_mails
WHERE page_id = $1
  AND status IN ('pending', 'failed', 'skipped');

-- name: HasActiveScheduledPageMail :one
SELECT EXISTS (
    SELECT 1
    FROM scheduled_page_mails
    WHERE page_id = $1
      AND status IN ('pending', 'dispatching')
);

-- name: ClaimDueScheduledPageMails :many
WITH due AS (
    SELECT s.page_id
    FROM scheduled_page_mails s
    JOIN pages p ON p.id = s.page_id
    WHERE s.status = 'pending'
      AND s.next_attempt_at <= now()
      AND p.is_public
      AND p.published_at <= now()
    ORDER BY p.published_at
    LIMIT $1
    FOR UPDATE OF s SKIP LOCKED
)
UPDATE scheduled_page_mails s
SET status = 'dispatching',
    updated_at = now()
FROM due
WHERE s.page_id = due.page_id
RETURNING s.page_id, s.job_id, s.actor_user_id, s.dispatch_attempts;

-- name: ReleaseScheduledPageMail :exec
UPDATE scheduled_page_mails
SET status = 'pending',
    next_attempt_at = now(),
    updated_at = now()
WHERE page_id = $1
  AND status = 'dispatching';

-- name: MarkScheduledPageMailSent :exec
UPDATE scheduled_page_mails
SET status = 'sent',
    dispatch_attempts = dispatch_attempts + 1,
    last_error = '',
    next_attempt_at = now(),
    dispatched_at = now(),
    updated_at = now()
WHERE page_id = $1;

-- name: MarkScheduledPageMailFailed :exec
UPDATE scheduled_page_mails
SET status = CASE WHEN dispatch_attempts + 1 >= sqlc.arg(max_attempts)::integer THEN 'failed' ELSE 'pending' END,
    dispatch_attempts = dispatch_attempts + 1,
    last_error = sqlc.arg(last_error),
    next_attempt_at = CASE
        WHEN dispatch_attempts + 1 >= sqlc.arg(max_attempts)::integer THEN now()
        ELSE now() + LEAST(
            interval '1 hour',
            interval '1 minute' * LEAST(power(2::double precision, dispatch_attempts), 60.0)
        )
    END,
    updated_at = now()
WHERE page_id = sqlc.arg(page_id);

-- name: MarkScheduledPageMailSkipped :exec
UPDATE scheduled_page_mails
SET status = 'skipped',
    last_error = '',
    next_attempt_at = now(),
    updated_at = now()
WHERE page_id = $1;

-- name: ReclaimStaleScheduledPageMails :execrows
UPDATE scheduled_page_mails
SET status = 'pending',
    next_attempt_at = now(),
    updated_at = now()
WHERE status = 'dispatching'
  AND updated_at < $1;
