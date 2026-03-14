-- name: ListPublicOpenFormsByCircle :many
SELECT id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message, created_at
FROM forms
WHERE circle_id = $1
  AND is_public = true
  AND is_open = true
ORDER BY close_at ASC, id ASC;

-- name: GetPublicOpenFormByID :one
SELECT id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message, created_at
FROM forms
WHERE circle_id = $1
  AND id = $2
  AND is_public = true
  AND is_open = true
LIMIT 1;

-- name: ListStaffFormsByCircle :many
SELECT id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message, created_at
FROM forms
WHERE circle_id = $1
ORDER BY close_at ASC, id ASC;

-- name: GetStaffFormByID :one
SELECT id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message, created_at
FROM forms
WHERE circle_id = $1
  AND id = $2
LIMIT 1;

-- name: GetAnyStaffFormByID :one
SELECT id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message, created_at
FROM forms
WHERE id = $1
LIMIT 1;

-- name: CreateForm :one
INSERT INTO forms (id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message)
VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message, created_at;

-- name: UpdateForm :one
UPDATE forms
SET name = $3,
    description = $4,
    is_public = $5,
    is_open = $6,
    open_at = $7,
    close_at = $8,
    max_answers = $9,
    answerable_tags = $10,
    confirmation_message = $11
WHERE circle_id = $1
  AND id = $2
RETURNING id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message, created_at;

-- name: UpdateAnyFormByID :one
UPDATE forms
SET name = $2,
    description = $3,
    is_public = $4,
    is_open = $5,
    open_at = $6,
    close_at = $7,
    max_answers = $8,
    answerable_tags = $9,
    confirmation_message = $10
WHERE id = $1
RETURNING id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message, created_at;

-- name: DeleteForm :execrows
DELETE FROM forms
WHERE circle_id = $1
  AND id = $2;
