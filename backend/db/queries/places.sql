-- name: ListPlaces :many
SELECT id, name, type, notes, created_at, updated_at
FROM places
ORDER BY name ASC;

-- name: CreatePlace :one
INSERT INTO places (name, type, notes)
VALUES ($1, $2, $3)
RETURNING id, name, type, notes, created_at, updated_at;

-- name: UpdatePlace :one
UPDATE places
SET name = $2,
    type = $3,
    notes = $4,
    updated_at = now()
WHERE id = $1
RETURNING id, name, type, notes, created_at, updated_at;

-- name: DeletePlace :execrows
DELETE FROM places
WHERE id = $1;
