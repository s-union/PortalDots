-- name: ListPublicPagesByCircle :many
SELECT id, circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, published_at
FROM pages
WHERE circle_id = $1
  AND is_public = true
  AND is_pinned = false
  AND (cardinality(viewable_tags) = 0 OR viewable_tags && $2::text[])
  AND ($3 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($3) || '%')
ORDER BY published_at DESC;

-- name: ListPublicPages :many
SELECT id, circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, published_at
FROM pages
WHERE is_public = true
  AND is_pinned = false
  AND (cardinality(viewable_tags) = 0 OR viewable_tags && $1::text[])
  AND ($2 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($2) || '%')
ORDER BY published_at DESC;

-- name: ListStaffPagesByCircle :many
SELECT id, circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, published_at
FROM pages
WHERE circle_id = $1
  AND ($2 = '' OR lower(title || E'\n' || body) LIKE '%' || lower($2) || '%')
ORDER BY published_at DESC;

-- name: GetPublicPageByID :one
SELECT id, circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, published_at
FROM pages
WHERE circle_id = $1
  AND (cardinality(viewable_tags) = 0 OR viewable_tags && $2::text[])
  AND id = $3
  AND is_public = true
  AND is_pinned = false
LIMIT 1;

-- name: GetPublicPageByIDGlobal :one
SELECT id, circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, published_at
FROM pages
WHERE (cardinality(viewable_tags) = 0 OR viewable_tags && $1::text[])
  AND id = $2
  AND is_public = true
  AND is_pinned = false
LIMIT 1;

-- name: CreatePage :one
INSERT INTO pages (circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, published_at;

-- name: GetStaffPageByID :one
SELECT id, circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, published_at
FROM pages
WHERE circle_id = $1
  AND id = $2
LIMIT 1;

-- name: UpdatePage :one
UPDATE pages
SET title = $3,
    body = $4,
    notes = $5,
    is_pinned = $6,
    is_public = $7,
    viewable_tags = $8,
    document_ids = $9
WHERE circle_id = $1
  AND id = $2
RETURNING id, circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, published_at;

-- name: PatchPagePin :one
UPDATE pages
SET is_pinned = $3
WHERE circle_id = $1
  AND id = $2
RETURNING id, circle_id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, published_at;

-- name: DeletePage :execrows
DELETE FROM pages
WHERE circle_id = $1
  AND id = $2;
