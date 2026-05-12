-- name: ListGuestPages :many
SELECT id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at
FROM pages
WHERE is_public = true
  AND is_pinned = false
  AND cardinality(viewable_tags) = 0
  AND ($1 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($1) || '%')
ORDER BY updated_at DESC, id DESC;

-- name: CountGuestPages :one
SELECT count(*)
FROM pages
WHERE is_public = true
  AND is_pinned = false
  AND cardinality(viewable_tags) = 0
  AND ($1 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($1) || '%');

-- name: ListGuestPagesPaginated :many
SELECT id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at
FROM pages
WHERE is_public = true
  AND is_pinned = false
  AND cardinality(viewable_tags) = 0
  AND ($1 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($1) || '%')
ORDER BY updated_at DESC, id DESC
LIMIT $2 OFFSET $3;

-- name: ListPagesForCircle :many
SELECT id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at
FROM pages
WHERE is_public = true
  AND is_pinned = false
  AND (cardinality(viewable_tags) = 0 OR viewable_tags && $1::text[])
  AND ($2 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($2) || '%')
ORDER BY updated_at DESC, id DESC;

-- name: CountPagesForCircle :one
SELECT count(*)
FROM pages
WHERE is_public = true
  AND is_pinned = false
  AND (cardinality(viewable_tags) = 0 OR viewable_tags && $1::text[])
  AND ($2 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($2) || '%');

-- name: ListPagesForCirclePaginated :many
SELECT id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at
FROM pages
WHERE is_public = true
  AND is_pinned = false
  AND (cardinality(viewable_tags) = 0 OR viewable_tags && $1::text[])
  AND ($2 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($2) || '%')
ORDER BY updated_at DESC, id DESC
LIMIT $3 OFFSET $4;

-- name: ListStaffPages :many
SELECT id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at
FROM pages
WHERE ($1 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($1) || '%')
ORDER BY updated_at DESC, id DESC;

-- name: GetGuestPageByID :one
SELECT id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at
FROM pages
WHERE id = $1
  AND is_public = true
  AND is_pinned = false
  AND cardinality(viewable_tags) = 0
LIMIT 1;

-- name: GetPageByIDForCircle :one
SELECT id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at
FROM pages
WHERE id = $2
  AND is_public = true
  AND is_pinned = false
  AND (cardinality(viewable_tags) = 0 OR viewable_tags && $1::text[])
LIMIT 1;

-- name: GetStaffPageByID :one
SELECT id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at
FROM pages
WHERE id = $1
LIMIT 1;

-- name: CreatePage :one
INSERT INTO pages (title, body, notes, is_pinned, is_public, viewable_tags, document_ids)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at;

-- name: UpdatePage :one
UPDATE pages
SET title = $2,
    body = $3,
    notes = $4,
    is_pinned = $5,
    is_public = $6,
    viewable_tags = $7,
    document_ids = $8,
    updated_at = now()
WHERE id = $1
RETURNING id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at;

-- name: PatchPagePin :one
UPDATE pages
SET is_pinned = $2
WHERE id = $1
RETURNING id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at;

-- name: DeletePage :execrows
DELETE FROM pages
WHERE id = $1;

-- name: DeletePageReads :exec
DELETE FROM reads
WHERE page_id = $1;

-- name: ListReadPageIDsByUser :many
SELECT page_id
FROM reads
WHERE user_id = $1
  AND page_id = ANY($2::uuid[]);

-- name: UpsertPageRead :exec
INSERT INTO reads (page_id, user_id)
VALUES ($1, $2)
ON CONFLICT (page_id, user_id) DO NOTHING;
