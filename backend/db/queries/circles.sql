-- name: ListCircles :many
SELECT id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at
FROM circles
ORDER BY id;

-- name: GetCircleByID :one
SELECT id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at
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
    uuidv7(),
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at;

-- name: UpdateCircle :one
UPDATE circles
SET name = $2,
    group_name = $3,
    participation_type_id = $4,
    participation_type_name = $5,
    tags = $6
WHERE id = $1
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at;

-- name: DeleteCircle :exec
DELETE FROM circles
WHERE id = $1;

-- name: ListUserCircles :many
SELECT c.id, c.name, c.name_yomi, c.group_name, c.group_name_yomi, c.participation_type_id, c.participation_type_name, c.tags, c.invitation_token, c.submitted_at, c.notes, c.can_change_group_name, c.updated_at, c.status, c.status_reason, c.status_set_at, c.status_set_by, c.created_at
FROM circles c
JOIN circle_user cu ON cu.circle_id = c.id
WHERE cu.user_id = $1
ORDER BY c.id;

-- name: GetUserCircle :one
SELECT c.id, c.name, c.name_yomi, c.group_name, c.group_name_yomi, c.participation_type_id, c.participation_type_name, c.tags, c.invitation_token, c.submitted_at, c.notes, c.can_change_group_name, c.updated_at, c.status, c.status_reason, c.status_set_at, c.status_set_by, c.created_at
FROM circles c
JOIN circle_user cu ON cu.circle_id = c.id
WHERE c.id = $1 AND cu.user_id = $2;

-- name: GetCircleByInvitationToken :one
SELECT id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at
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
    can_change_group_name,
    invitation_token
) VALUES (
    uuidv7(),
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    encode(gen_random_bytes(16), 'hex')
)
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at;

-- name: CreateCircleUser :exec
INSERT INTO circle_user (circle_id, user_id, is_leader)
VALUES ($1, $2, $3);

-- name: UpdateCircleDetails :one
UPDATE circles
SET name = $2,
    name_yomi = $3,
    group_name = $4,
    group_name_yomi = $5,
    notes = $6,
    updated_at = now()
WHERE id = $1
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at;

-- name: SetCircleStatus :one
UPDATE circles
SET status = $2,
    status_reason = $3,
    status_set_at = CASE WHEN $2 = 'approved' OR $2 = 'rejected' THEN now() ELSE NULL END,
    status_set_by = CASE WHEN ($2 = 'approved' OR $2 = 'rejected') AND $4::text != '' THEN $4 ELSE NULL END
WHERE id = $1
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at;

-- name: SubmitCircle :one
UPDATE circles
SET submitted_at = now()
WHERE id = $1
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at;

-- name: ListCirclePlaceNames :many
SELECT b.circle_id, p.name
FROM booths b
JOIN places p ON p.id = b.place_id
WHERE b.circle_id = ANY($1::text[])
ORDER BY b.circle_id, p.name;

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
RETURNING id, name, name_yomi, group_name, group_name_yomi, participation_type_id, participation_type_name, tags, invitation_token, submitted_at, notes, can_change_group_name, updated_at, status, status_reason, status_set_at, status_set_by, created_at;

-- name: IsCircleMember :one
SELECT EXISTS(SELECT 1 FROM circle_user WHERE circle_id = $1 AND user_id = $2) AS exists;

-- name: IsCircleLeader :one
SELECT EXISTS(SELECT 1 FROM circle_user WHERE circle_id = $1 AND user_id = $2 AND is_leader = true) AS exists;

-- name: CountCircleMembers :one
SELECT COUNT(*) FROM circle_user WHERE circle_id = $1;
