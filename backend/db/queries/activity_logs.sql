-- name: ListActivityLogs :many
SELECT id, actor_user_id, action, target_type, target_id, circle_id, summary, created_at
FROM activity_logs
ORDER BY created_at DESC, id DESC;

-- name: CreateActivityLog :one
INSERT INTO activity_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    circle_id,
    summary
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
)
RETURNING id, actor_user_id, action, target_type, target_id, circle_id, summary, created_at;
