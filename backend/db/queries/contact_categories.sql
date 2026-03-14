-- name: ListContactCategories :many
SELECT id, name, email, created_at, updated_at
FROM contact_categories
ORDER BY name ASC;

-- name: CreateContactCategory :one
INSERT INTO contact_categories (name, email)
VALUES ($1, $2)
RETURNING id, name, email, created_at, updated_at;

-- name: UpdateContactCategory :one
UPDATE contact_categories
SET name = $2,
    email = $3,
    updated_at = now()
WHERE id = $1
RETURNING id, name, email, created_at, updated_at;

-- name: DeleteContactCategory :execrows
DELETE FROM contact_categories
WHERE id = $1;
