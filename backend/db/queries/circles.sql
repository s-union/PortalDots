-- name: ListCircles :many
SELECT id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, created_at
FROM circles
ORDER BY id;

-- name: GetCircleByID :one
SELECT id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, created_at
FROM circles
WHERE id = $1;

-- name: CreateCircle :one
INSERT INTO circles (
    id,
    name,
    group_name,
    participation_type_id,
    participation_type_name,
    tags
) VALUES (
    gen_random_uuid()::text,
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, created_at;

-- name: UpdateCircle :one
UPDATE circles
SET name = $2,
    group_name = $3,
    participation_type_id = $4,
    participation_type_name = $5,
    tags = $6
WHERE id = $1
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, created_at;

-- name: DeleteCircle :exec
DELETE FROM circles
WHERE id = $1;

-- name: ListUserCircles :many
SELECT c.id, c.name, c.name_yomi, c.group_name, c.group_name_yomi, c.participation_type_id, c.participation_type_name, c.tags, c.invitation_token, c.submitted_at, c.notes, c.created_at
FROM circles c
JOIN circle_user cu ON cu.circle_id = c.id
WHERE cu.user_id = $1
ORDER BY c.id;

-- name: GetUserCircle :one
SELECT c.id, c.name, c.name_yomi, c.group_name, c.group_name_yomi, c.participation_type_id, c.participation_type_name, c.tags, c.invitation_token, c.submitted_at, c.notes, c.created_at
FROM circles c
JOIN circle_user cu ON cu.circle_id = c.id
WHERE c.id = $1 AND cu.user_id = $2;

-- name: GetCircleByInvitationToken :one
SELECT id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, created_at
FROM circles
WHERE invitation_token = $1;

-- name: CreateUserCircle :one
INSERT INTO circles (
    id,
    name,
    name_yomi,
    group_name,
    group_name_yomi,
    participation_type_id,
    participation_type_name,
    notes,
    invitation_token
) VALUES (
    gen_random_uuid()::text,
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    encode(gen_random_bytes(16), 'hex')
)
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, created_at;

-- name: CreateCircleUser :exec
INSERT INTO circle_user (circle_id, user_id, is_leader)
VALUES ($1, $2, $3);

-- name: UpdateCircleDetails :one
UPDATE circles
SET name = $2,
    name_yomi = $3,
    group_name = $4,
    group_name_yomi = $5,
    notes = $6
WHERE id = $1
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, created_at;

-- name: SubmitCircle :one
UPDATE circles
SET submitted_at = now()
WHERE id = $1
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, created_at;

-- name: ListCircleMembers :many
SELECT u.id, u.display_name, cu.is_leader
FROM circle_user cu
JOIN users u ON u.id = cu.user_id
WHERE cu.circle_id = $1
ORDER BY cu.is_leader DESC, u.display_name;

-- name: RemoveCircleMember :exec
DELETE FROM circle_user
WHERE circle_id = $1 AND user_id = $2;

-- name: UpdateCircleInvitationToken :one
UPDATE circles
SET invitation_token = encode(gen_random_bytes(16), 'hex')
WHERE id = $1
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, created_at;

-- name: IsCircleMember :one
SELECT EXISTS(SELECT 1 FROM circle_user WHERE circle_id = $1 AND user_id = $2) AS exists;

-- name: IsCircleLeader :one
SELECT EXISTS(SELECT 1 FROM circle_user WHERE circle_id = $1 AND user_id = $2 AND is_leader = true) AS exists;

-- name: CountCircleMembers :one
SELECT COUNT(*) FROM circle_user WHERE circle_id = $1;
