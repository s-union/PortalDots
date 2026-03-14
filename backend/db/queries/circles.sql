-- name: ListCircles :many
SELECT id, name, group_name, participation_type_id, participation_type_name, tags, created_at
FROM circles
ORDER BY id;

-- name: GetCircleByID :one
SELECT id, name, group_name, participation_type_id, participation_type_name, tags, created_at
FROM circles
WHERE id = $1;

-- name: CreateCircle :one
INSERT INTO circles (
    id,
    name,
    group_name,
    participation_type_id,
    participation_type_name,
    tags
) VALUES (
    gen_random_uuid()::text,
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING id, name, group_name, participation_type_id, participation_type_name, tags, created_at;

-- name: UpdateCircle :one
UPDATE circles
SET name = $2,
    group_name = $3,
    participation_type_id = $4,
    participation_type_name = $5,
    tags = $6
WHERE id = $1
RETURNING id, name, group_name, participation_type_id, participation_type_name, tags, created_at;

-- name: DeleteCircle :exec
DELETE FROM circles
WHERE id = $1;
