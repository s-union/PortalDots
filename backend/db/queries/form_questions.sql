-- name: ListFormQuestionsByFormID :many
SELECT id, form_id, name, description, type, is_required, number_min, number_max, allowed_types, options, priority, created_at, updated_at
FROM form_questions
WHERE form_id = $1
ORDER BY priority ASC, created_at ASC;

-- name: CreateFormQuestion :one
INSERT INTO form_questions (
    form_id,
    name,
    description,
    type,
    is_required,
    number_min,
    number_max,
    allowed_types,
    options,
    priority
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, form_id, name, description, type, is_required, number_min, number_max, allowed_types, options, priority, created_at, updated_at;

-- name: UpdateFormQuestion :one
UPDATE form_questions
SET name = $2,
    description = $3,
    type = $4,
    is_required = $5,
    number_min = $6,
    number_max = $7,
    allowed_types = $8,
    options = $9,
    priority = $10,
    updated_at = now()
WHERE id = $1
RETURNING id, form_id, name, description, type, is_required, number_min, number_max, allowed_types, options, priority, created_at, updated_at;

-- name: DeleteFormQuestion :execrows
DELETE FROM form_questions
WHERE id = $1;

-- name: CountFormQuestionsByFormID :one
SELECT COUNT(*)::bigint
FROM form_questions
WHERE form_id = $1;
