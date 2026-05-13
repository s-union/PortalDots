-- name: ListPublicOpenFormsByCircle :many
SELECT *
FROM forms
WHERE circle_id = $1
  AND is_public = true
  AND is_open = true
ORDER BY close_at ASC, id ASC;

-- name: GetPublicOpenFormByID :one
SELECT *
FROM forms
WHERE circle_id = $1
  AND id = $2
  AND is_public = true
  AND is_open = true
LIMIT 1;

-- name: ListStaffFormsByCircle :many
SELECT *
FROM forms
WHERE circle_id IS NOT DISTINCT FROM $1
ORDER BY close_at ASC, id ASC;

-- name: GetStaffFormByID :one
SELECT *
FROM forms
WHERE circle_id IS NOT DISTINCT FROM $1
  AND id = $2
LIMIT 1;

-- name: GetAnyStaffFormByID :one
SELECT *
FROM forms
WHERE id = $1
LIMIT 1;

-- name: CreateForm :one
INSERT INTO forms (id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message, created_by_user_id)
VALUES (uuidv7(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: UpdateForm :one
UPDATE forms
SET name = $3,
    description = $4,
    is_public = $5,
    is_open = $6,
    open_at = $7,
    close_at = $8,
    updated_at = now(),
    max_answers = $9,
    answerable_tags = $10,
    confirmation_message = $11
WHERE circle_id = $1
  AND id = $2
RETURNING *;

-- name: UpdateAnyFormByID :one
UPDATE forms
SET name = $2,
    description = $3,
    is_public = $4,
    is_open = $5,
    open_at = $6,
    close_at = $7,
    updated_at = now(),
    max_answers = $8,
    answerable_tags = $9,
    confirmation_message = $10
WHERE id = $1
RETURNING *;

-- name: DeleteForm :execrows
DELETE FROM forms
WHERE circle_id IS NOT DISTINCT FROM $1
  AND id = $2;
