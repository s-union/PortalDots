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
SET name = sqlc.arg(name),
    color = COALESCE(sqlc.narg('color'), color),
    updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id, name, color, created_at, updated_at;

-- name: DeleteTag :execrows
DELETE FROM tags
WHERE id = $1;
