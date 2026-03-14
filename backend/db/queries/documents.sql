-- name: ListPublicDocumentsByCircle :many
SELECT id, circle_id, name, description, notes, is_public, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE circle_id = $1
  AND is_public = true
ORDER BY updated_at DESC, id DESC;

-- name: GetPublicDocumentByID :one
SELECT id, circle_id, name, description, notes, is_public, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE circle_id = $1
  AND id = $2
  AND is_public = true
LIMIT 1;

-- name: ListStaffDocumentsByCircle :many
SELECT id, circle_id, name, description, notes, is_public, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE circle_id = $1
ORDER BY updated_at DESC, id DESC;

-- name: GetStaffDocumentByID :one
SELECT id, circle_id, name, description, notes, is_public, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE circle_id = $1
  AND id = $2
LIMIT 1;

-- name: CreateStaffDocument :one
INSERT INTO documents (circle_id, name, description, notes, is_public, is_important, filename, mime_type, content)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, circle_id, name, description, notes, is_public, is_important, filename, mime_type, content, created_at, updated_at;

-- name: UpdateStaffDocument :one
UPDATE documents
SET name = $3,
    description = $4,
    notes = $5,
    is_public = $6,
    is_important = $7,
    filename = $8,
    mime_type = $9,
    content = $10,
    updated_at = now()
WHERE circle_id = $1
  AND id = $2
RETURNING id, circle_id, name, description, notes, is_public, is_important, filename, mime_type, content, created_at, updated_at;

-- name: DeleteStaffDocument :execrows
DELETE FROM documents
WHERE circle_id = $1
  AND id = $2;
