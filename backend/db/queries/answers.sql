-- name: GetLatestAnswerByFormAndCircle :one
SELECT id, form_id, circle_id, body, updated_at, created_at
FROM answers
WHERE form_id = $1
  AND circle_id = $2
ORDER BY updated_at DESC, id DESC
LIMIT 1;

-- name: GetAnswerByID :one
SELECT id, form_id, circle_id, body, updated_at, created_at
FROM answers
WHERE id = $1
LIMIT 1;

-- name: ListAnswersByCircle :many
SELECT id, form_id, circle_id, body, updated_at, created_at
FROM answers
WHERE circle_id = $1
ORDER BY updated_at DESC, id DESC;

-- name: ListAnswersByForm :many
SELECT id, form_id, circle_id, body, updated_at, created_at
FROM answers
WHERE form_id = $1
ORDER BY updated_at DESC, id DESC;

-- name: ListAnswersByFormAndCircle :many
SELECT id, form_id, circle_id, body, updated_at, created_at
FROM answers
WHERE form_id = $1
  AND circle_id = $2
ORDER BY updated_at DESC, id DESC;

-- name: CreateAnswer :one
INSERT INTO answers (form_id, circle_id, body)
VALUES ($1, $2, $3)
RETURNING id, form_id, circle_id, body, updated_at, created_at;

-- name: UpdateAnswerByID :one
UPDATE answers
SET body = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, form_id, circle_id, body, updated_at, created_at;

-- name: DeleteAnswerByID :execrows
DELETE FROM answers
WHERE id = $1;

-- name: ListAnswerDetailsByAnswerID :many
SELECT id, answer_id, form_id, circle_id, question_id, value, position, created_at
FROM answer_details
WHERE answer_id = $1
ORDER BY question_id ASC, position ASC, created_at ASC;

-- name: DeleteAnswerDetailsByAnswer :execrows
DELETE FROM answer_details
WHERE answer_id = $1;

-- name: CreateAnswerDetail :one
INSERT INTO answer_details (answer_id, form_id, circle_id, question_id, value, position)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, answer_id, form_id, circle_id, question_id, value, position, created_at;

-- name: ListAnswerUploadsByAnswerID :many
SELECT id, answer_id, form_id, circle_id, question_id, filename, mime_type, size_bytes, created_at
FROM answer_uploads
WHERE answer_id = $1
ORDER BY created_at DESC, id DESC;

-- name: GetAnswerUploadFileByID :one
SELECT id, answer_id, form_id, circle_id, question_id, filename, mime_type, content, size_bytes, created_at
FROM answer_uploads
WHERE id = $1
LIMIT 1;

-- name: GetAnswerUploadFileByAnswerAndQuestion :one
SELECT id, answer_id, form_id, circle_id, question_id, filename, mime_type, content, size_bytes, created_at
FROM answer_uploads
WHERE answer_id = $1
  AND question_id = $2
ORDER BY created_at DESC, id DESC
LIMIT 1;

-- name: DeleteAnswerUploadsByAnswerAndQuestion :execrows
DELETE FROM answer_uploads
WHERE answer_id = $1
  AND question_id = $2;

-- name: CreateAnswerUpload :one
INSERT INTO answer_uploads (answer_id, form_id, circle_id, question_id, filename, mime_type, content, size_bytes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, answer_id, form_id, circle_id, question_id, filename, mime_type, size_bytes, created_at;
