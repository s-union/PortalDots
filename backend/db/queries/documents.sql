-- name: ListPublicDocumentsByCircle :many
SELECT id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE circle_id = $1
  AND is_public = true
  AND cardinality(viewable_tags) = 0
ORDER BY updated_at DESC, id DESC;

-- name: ListPublicDocuments :many
SELECT id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE is_public = true
  AND cardinality(viewable_tags) = 0
ORDER BY updated_at DESC, id DESC;

-- name: ListPublicDocumentsForCircleTags :many
SELECT id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE is_public = true
  AND (cardinality(viewable_tags) = 0 OR viewable_tags && $1::text[])
ORDER BY updated_at DESC, id DESC;

-- name: GetPublicDocumentByID :one
SELECT id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE circle_id = $1
  AND id = $2
  AND is_public = true
  AND cardinality(viewable_tags) = 0
LIMIT 1;

-- name: GetPublicDocumentByIDGlobal :one
SELECT id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE id = $1
  AND is_public = true
  AND cardinality(viewable_tags) = 0
LIMIT 1;

-- name: GetPublicDocumentByIDGlobalForCircleTags :one
SELECT id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE id = $1
  AND is_public = true
  AND (cardinality(viewable_tags) = 0 OR viewable_tags && $2::text[])
LIMIT 1;

-- name: ListStaffDocumentsByCircle :many
SELECT id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE circle_id = $1
ORDER BY updated_at DESC, id DESC;

-- name: GetStaffDocumentByID :one
SELECT id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE circle_id = $1
  AND id = $2
LIMIT 1;

-- name: GetStaffDocumentByIDGlobal :one
SELECT id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at
FROM documents
WHERE id = $1
LIMIT 1;

-- name: CreateStaffDocument :one
INSERT INTO documents (circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at;

-- name: UpdateStaffDocument :one
UPDATE documents
SET name = $3,
    description = $4,
    notes = $5,
    is_public = $6,
    viewable_tags = $7,
    is_important = $8,
    filename = $9,
    mime_type = $10,
    content = $11,
    updated_at = now()
WHERE circle_id = $1
  AND id = $2
RETURNING id, circle_id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at;

-- name: DeleteStaffDocument :execrows
DELETE FROM documents
WHERE circle_id = $1
  AND id = $2;

-- name: MarkDocumentRead :exec
INSERT INTO document_reads (document_id, user_id)
VALUES ($1, $2)
ON CONFLICT (document_id, user_id) DO NOTHING;

-- name: ListReadDocumentIDsByUser :many
SELECT document_id
FROM document_reads
WHERE user_id = $1
  AND document_id = ANY($2::uuid[]);
