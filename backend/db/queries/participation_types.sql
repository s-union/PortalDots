-- name: ListParticipationTypes :many
SELECT id, name, description, users_count_min, users_count_max, tags, form_id, created_at, updated_at
FROM participation_types
ORDER BY name ASC, id ASC;

-- name: GetParticipationTypeByID :one
SELECT id, name, description, users_count_min, users_count_max, tags, form_id, created_at, updated_at
FROM participation_types
WHERE id = $1
LIMIT 1;

-- name: GetParticipationTypeByFormID :one
SELECT id, name, description, users_count_min, users_count_max, tags, form_id, created_at, updated_at
FROM participation_types
WHERE form_id = $1
LIMIT 1;

-- name: CreateParticipationType :one
INSERT INTO participation_types (id, name, description, users_count_min, users_count_max, tags, form_id)
VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6)
RETURNING id, name, description, users_count_min, users_count_max, tags, form_id, created_at, updated_at;

-- name: UpdateParticipationType :one
UPDATE participation_types
SET name = $2,
    description = $3,
    users_count_min = $4,
    users_count_max = $5,
    tags = $6,
    updated_at = now()
WHERE id = $1
RETURNING id, name, description, users_count_min, users_count_max, tags, form_id, created_at, updated_at;

-- name: DeleteParticipationType :execrows
DELETE FROM participation_types
WHERE id = $1;
