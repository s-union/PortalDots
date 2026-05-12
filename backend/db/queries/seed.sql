-- name: SeedUpsertTag :exec
INSERT INTO tags (id, name)
VALUES ($1, $2)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = now();

-- name: SeedUpsertCircleWithoutParticipationType :exec
INSERT INTO circles (id, name, name_yomi, group_name, group_name_yomi, participation_type_name, tags)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (id) DO NOTHING;

-- name: SeedUpsertCircle :exec
INSERT INTO circles (id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    name_yomi = EXCLUDED.name_yomi,
    group_name = EXCLUDED.group_name,
    group_name_yomi = EXCLUDED.group_name_yomi,
    participation_type_id = EXCLUDED.participation_type_id,
    participation_type_name = EXCLUDED.participation_type_name,
    tags = EXCLUDED.tags;

-- name: SeedUpsertForm :exec
INSERT INTO forms (id, circle_id, name, description, is_public, is_open, open_at, close_at, max_answers, answerable_tags, confirmation_message)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (id) DO UPDATE
SET circle_id = EXCLUDED.circle_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_public = EXCLUDED.is_public,
    is_open = EXCLUDED.is_open,
    open_at = EXCLUDED.open_at,
    close_at = EXCLUDED.close_at,
    max_answers = EXCLUDED.max_answers,
    answerable_tags = EXCLUDED.answerable_tags,
    confirmation_message = EXCLUDED.confirmation_message;

-- name: SeedUpsertParticipationType :exec
INSERT INTO participation_types (id, name, description, users_count_min, users_count_max, tags, form_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    users_count_min = EXCLUDED.users_count_min,
    users_count_max = EXCLUDED.users_count_max,
    tags = EXCLUDED.tags,
    form_id = EXCLUDED.form_id,
    updated_at = now();

-- name: SeedUpsertUser :exec
INSERT INTO users (
    id,
    last_name,
    last_name_reading,
    first_name,
    first_name_reading,
    display_name,
    contact_email,
    phone_number,
    password,
    is_verified,
    is_email_verified,
    is_univemail_verified
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
ON CONFLICT (id) DO UPDATE
SET last_name = EXCLUDED.last_name,
    last_name_reading = EXCLUDED.last_name_reading,
    first_name = EXCLUDED.first_name,
    first_name_reading = EXCLUDED.first_name_reading,
    display_name = EXCLUDED.display_name,
    contact_email = EXCLUDED.contact_email,
    phone_number = EXCLUDED.phone_number,
    password = EXCLUDED.password,
    is_verified = EXCLUDED.is_verified,
    is_email_verified = EXCLUDED.is_email_verified,
    is_univemail_verified = EXCLUDED.is_univemail_verified,
    updated_at = now();

-- name: SeedDeleteCircleUserByUserID :exec
DELETE FROM circle_user WHERE user_id = $1;

-- name: SeedUpsertCircleUser :exec
INSERT INTO circle_user (circle_id, user_id, is_leader)
VALUES ($1, $2, $3)
ON CONFLICT (circle_id, user_id) DO UPDATE
SET is_leader = EXCLUDED.is_leader;

-- name: SeedUpsertDocument :exec
INSERT INTO documents (id, name, description, notes, is_public, viewable_tags, is_important, filename, mime_type, content, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    is_public = EXCLUDED.is_public,
    viewable_tags = EXCLUDED.viewable_tags,
    is_important = EXCLUDED.is_important,
    filename = EXCLUDED.filename,
    mime_type = EXCLUDED.mime_type,
    content = EXCLUDED.content,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

-- name: SeedUpsertPage :exec
INSERT INTO pages (id, title, body, notes, is_pinned, is_public, viewable_tags, document_ids, created_at, updated_at, published_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $9)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    body = EXCLUDED.body,
    notes = EXCLUDED.notes,
    is_pinned = EXCLUDED.is_pinned,
    is_public = EXCLUDED.is_public,
    viewable_tags = EXCLUDED.viewable_tags,
    document_ids = EXCLUDED.document_ids,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    published_at = EXCLUDED.published_at;

-- name: SeedUpsertPlace :exec
INSERT INTO places (id, name, type, notes)
VALUES ($1, $2, $3, $4)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    type = EXCLUDED.type,
    notes = EXCLUDED.notes,
    updated_at = now();

-- name: SeedUpsertBooth :exec
INSERT INTO booths (place_id, circle_id)
VALUES ($1, $2)
ON CONFLICT (place_id, circle_id) DO NOTHING;

-- name: SeedUpsertContactCategory :exec
INSERT INTO contact_categories (id, name, email)
VALUES ($1, $2, $3)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = now();
