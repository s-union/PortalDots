-- name: ListTags :many
SELECT id, name, color, created_at, updated_at
FROM tags
ORDER BY name ASC;

-- name: CreateTag :one
INSERT INTO tags (name, color)
VALUES ($1, $2)
RETURNING id, name, color, created_at, updated_at;

-- name: UpdateTag :one
UPDATE tags
SET name = $2,
    color = $3,
    updated_at = now()
WHERE id = $1
RETURNING id, name, color, created_at, updated_at;

-- name: DeleteTag :execrows
DELETE FROM tags
WHERE id = $1;
