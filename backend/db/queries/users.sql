-- name: CountUsers :one
SELECT count(*)::bigint AS count
FROM users;

-- name: ListUsers :many
SELECT id, display_name, password, is_verified, created_at
FROM users
ORDER BY id;

-- name: ListUsersWithRelations :many
SELECT
    users.id,
    users.last_name,
    users.last_name_reading,
    users.first_name,
    users.first_name_reading,
    users.display_name,
    users.contact_email,
    users.phone_number,
    users.is_verified,
    users.is_email_verified,
    COALESCE(
        array_agg(DISTINCT user_login_ids.login_id) FILTER (WHERE user_login_ids.login_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS login_ids,
    COALESCE(
        array_agg(DISTINCT user_roles.role) FILTER (WHERE user_roles.role IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS roles,
    COALESCE(
        array_agg(DISTINCT user_permissions.permission) FILTER (WHERE user_permissions.permission IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS permissions,
    COALESCE(
        array_agg(DISTINCT circle_user.circle_id) FILTER (WHERE circle_user.circle_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS circle_ids
FROM users
LEFT JOIN user_login_ids ON user_login_ids.user_id = users.id
LEFT JOIN user_roles ON user_roles.user_id = users.id
LEFT JOIN user_permissions ON user_permissions.user_id = users.id
LEFT JOIN circle_user ON circle_user.user_id = users.id
GROUP BY users.id, users.last_name, users.last_name_reading, users.first_name, users.first_name_reading,
         users.display_name, users.contact_email, users.phone_number, users.is_verified, users.is_email_verified
ORDER BY users.id;

-- name: GetUserByID :one
SELECT id, display_name, password, is_verified, created_at
FROM users
WHERE id = $1;

-- name: GetUserWithRelationsByID :one
SELECT
    users.id,
    users.last_name,
    users.last_name_reading,
    users.first_name,
    users.first_name_reading,
    users.display_name,
    users.contact_email,
    users.phone_number,
    users.is_verified,
    users.is_email_verified,
    COALESCE(
        array_agg(DISTINCT user_login_ids.login_id) FILTER (WHERE user_login_ids.login_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS login_ids,
    COALESCE(
        array_agg(DISTINCT user_roles.role) FILTER (WHERE user_roles.role IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS roles,
    COALESCE(
        array_agg(DISTINCT user_permissions.permission) FILTER (WHERE user_permissions.permission IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS permissions,
    COALESCE(
        array_agg(DISTINCT circle_user.circle_id) FILTER (WHERE circle_user.circle_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS circle_ids
FROM users
LEFT JOIN user_login_ids ON user_login_ids.user_id = users.id
LEFT JOIN user_roles ON user_roles.user_id = users.id
LEFT JOIN user_permissions ON user_permissions.user_id = users.id
LEFT JOIN circle_user ON circle_user.user_id = users.id
WHERE users.id = $1
GROUP BY users.id, users.last_name, users.last_name_reading, users.first_name, users.first_name_reading,
         users.display_name, users.contact_email, users.phone_number, users.is_verified, users.is_email_verified;

-- name: GetUserByLoginID :one
SELECT users.id, users.display_name, users.password, users.is_verified, users.created_at
FROM users
JOIN user_login_ids ON user_login_ids.user_id = users.id
WHERE user_login_ids.login_id = $1
LIMIT 1;

-- name: ListUserRoles :many
SELECT role
FROM user_roles
WHERE user_id = $1
ORDER BY role;

-- name: ListUserPermissions :many
SELECT permission
FROM user_permissions
WHERE user_id = $1
ORDER BY permission;

-- name: ListUserLoginIDs :many
SELECT login_id
FROM user_login_ids
WHERE user_id = $1
ORDER BY login_id;

-- name: DeleteUserRoles :exec
DELETE FROM user_roles
WHERE user_id = $1;

-- name: DeleteUserLoginIDs :exec
DELETE FROM user_login_ids
WHERE user_id = $1;

-- name: AddUserRole :exec
INSERT INTO user_roles (user_id, role)
VALUES ($1, $2)
ON CONFLICT (user_id, role) DO NOTHING;

-- name: AddUserLoginID :exec
INSERT INTO user_login_ids (login_id, user_id)
VALUES ($1, $2)
ON CONFLICT (login_id) DO UPDATE
SET user_id = EXCLUDED.user_id;

-- name: DeleteUserPermissions :exec
DELETE FROM user_permissions
WHERE user_id = $1;

-- name: AddUserPermission :exec
INSERT INTO user_permissions (user_id, permission)
VALUES ($1, $2)
ON CONFLICT (user_id, permission) DO NOTHING;

-- name: UpdateUserDisplayName :one
UPDATE users
SET display_name = $2
WHERE id = $1
RETURNING id, display_name, password, is_verified, created_at;

-- name: UpdateUserIsVerified :one
UPDATE users
SET is_verified = $2
WHERE id = $1
RETURNING id, display_name, password, is_verified, created_at;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;

-- name: UpdateUserPassword :one
UPDATE users
SET password = $2
WHERE id = $1
RETURNING id, display_name, password, is_verified, created_at;

-- name: ListVerifiedUsersWithRelations :many
SELECT
    users.id,
    users.last_name,
    users.last_name_reading,
    users.first_name,
    users.first_name_reading,
    users.display_name,
    users.contact_email,
    users.phone_number,
    users.is_verified,
    users.is_email_verified,
    COALESCE(
        array_agg(DISTINCT user_login_ids.login_id) FILTER (WHERE user_login_ids.login_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS login_ids,
    COALESCE(
        array_agg(DISTINCT user_roles.role) FILTER (WHERE user_roles.role IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS roles,
    COALESCE(
        array_agg(DISTINCT user_permissions.permission) FILTER (WHERE user_permissions.permission IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS permissions,
    COALESCE(
        array_agg(DISTINCT circle_user.circle_id) FILTER (WHERE circle_user.circle_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS circle_ids
FROM users
LEFT JOIN user_login_ids ON user_login_ids.user_id = users.id
LEFT JOIN user_roles ON user_roles.user_id = users.id
LEFT JOIN user_permissions ON user_permissions.user_id = users.id
LEFT JOIN circle_user ON circle_user.user_id = users.id
WHERE users.is_verified = true
GROUP BY users.id, users.last_name, users.last_name_reading, users.first_name, users.first_name_reading,
         users.display_name, users.contact_email, users.phone_number, users.is_verified, users.is_email_verified
ORDER BY users.id;

-- name: ListUsersByCircleIDs :many
SELECT
    users.id,
    users.last_name,
    users.last_name_reading,
    users.first_name,
    users.first_name_reading,
    users.display_name,
    users.contact_email,
    users.phone_number,
    users.is_verified,
    users.is_email_verified,
    COALESCE(
        array_agg(DISTINCT user_login_ids.login_id) FILTER (WHERE user_login_ids.login_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS login_ids,
    COALESCE(
        array_agg(DISTINCT user_roles.role) FILTER (WHERE user_roles.role IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS roles,
    COALESCE(
        array_agg(DISTINCT user_permissions.permission) FILTER (WHERE user_permissions.permission IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS permissions,
    COALESCE(
        array_agg(DISTINCT circle_user.circle_id) FILTER (WHERE circle_user.circle_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS circle_ids
FROM users
LEFT JOIN user_login_ids ON user_login_ids.user_id = users.id
LEFT JOIN user_roles ON user_roles.user_id = users.id
LEFT JOIN user_permissions ON user_permissions.user_id = users.id
JOIN circle_user ON circle_user.user_id = users.id
WHERE circle_user.circle_id = ANY($1::text[])
GROUP BY users.id, users.last_name, users.last_name_reading, users.first_name, users.first_name_reading,
         users.display_name, users.contact_email, users.phone_number, users.is_verified, users.is_email_verified
ORDER BY users.id;

-- name: ListVerifiedUsersByCircleIDs :many
SELECT
    users.id,
    users.last_name,
    users.last_name_reading,
    users.first_name,
    users.first_name_reading,
    users.display_name,
    users.contact_email,
    users.phone_number,
    users.is_verified,
    users.is_email_verified,
    COALESCE(
        array_agg(DISTINCT user_login_ids.login_id) FILTER (WHERE user_login_ids.login_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS login_ids,
    COALESCE(
        array_agg(DISTINCT user_roles.role) FILTER (WHERE user_roles.role IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS roles,
    COALESCE(
        array_agg(DISTINCT user_permissions.permission) FILTER (WHERE user_permissions.permission IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS permissions,
    COALESCE(
        array_agg(DISTINCT circle_user.circle_id) FILTER (WHERE circle_user.circle_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS circle_ids
FROM users
LEFT JOIN user_login_ids ON user_login_ids.user_id = users.id
LEFT JOIN user_roles ON user_roles.user_id = users.id
LEFT JOIN user_permissions ON user_permissions.user_id = users.id
JOIN circle_user ON circle_user.user_id = users.id
WHERE users.is_verified = true
  AND circle_user.circle_id = ANY($1::text[])
GROUP BY users.id, users.last_name, users.last_name_reading, users.first_name, users.first_name_reading,
         users.display_name, users.contact_email, users.phone_number, users.is_verified, users.is_email_verified
ORDER BY users.id;

-- name: ListVerifiedCircleLeadersByCircleIDs :many
SELECT
    users.id,
    users.last_name,
    users.last_name_reading,
    users.first_name,
    users.first_name_reading,
    users.display_name,
    users.contact_email,
    users.phone_number,
    users.is_verified,
    users.is_email_verified,
    COALESCE(
        array_agg(DISTINCT user_login_ids.login_id) FILTER (WHERE user_login_ids.login_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS login_ids,
    COALESCE(
        array_agg(DISTINCT user_roles.role) FILTER (WHERE user_roles.role IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS roles,
    COALESCE(
        array_agg(DISTINCT user_permissions.permission) FILTER (WHERE user_permissions.permission IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS permissions,
    COALESCE(
        array_agg(DISTINCT circle_user.circle_id) FILTER (WHERE circle_user.circle_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS circle_ids
FROM users
LEFT JOIN user_login_ids ON user_login_ids.user_id = users.id
LEFT JOIN user_roles ON user_roles.user_id = users.id
LEFT JOIN user_permissions ON user_permissions.user_id = users.id
JOIN circle_user ON circle_user.user_id = users.id
WHERE users.is_verified = true
  AND circle_user.is_leader = true
  AND circle_user.circle_id = ANY($1::text[])
GROUP BY users.id, users.last_name, users.last_name_reading, users.first_name, users.first_name_reading,
         users.display_name, users.contact_email, users.phone_number, users.is_verified, users.is_email_verified
ORDER BY users.id;

-- name: ListCircleLeadersByCircleIDs :many
SELECT
    users.id,
    users.last_name,
    users.last_name_reading,
    users.first_name,
    users.first_name_reading,
    users.display_name,
    users.contact_email,
    users.phone_number,
    users.is_verified,
    users.is_email_verified,
    COALESCE(
        array_agg(DISTINCT user_login_ids.login_id) FILTER (WHERE user_login_ids.login_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS login_ids,
    COALESCE(
        array_agg(DISTINCT user_roles.role) FILTER (WHERE user_roles.role IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS roles,
    COALESCE(
        array_agg(DISTINCT user_permissions.permission) FILTER (WHERE user_permissions.permission IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS permissions,
    COALESCE(
        array_agg(DISTINCT circle_user.circle_id) FILTER (WHERE circle_user.circle_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS circle_ids
FROM users
LEFT JOIN user_login_ids ON user_login_ids.user_id = users.id
LEFT JOIN user_roles ON user_roles.user_id = users.id
LEFT JOIN user_permissions ON user_permissions.user_id = users.id
JOIN circle_user ON circle_user.user_id = users.id
WHERE circle_user.is_leader = true
  AND circle_user.circle_id = ANY($1::text[])
GROUP BY users.id, users.last_name, users.last_name_reading, users.first_name, users.first_name_reading,
         users.display_name, users.contact_email, users.phone_number, users.is_verified, users.is_email_verified
ORDER BY users.id;

-- name: ListUsersWithQuery :many
SELECT
    users.id,
    users.last_name,
    users.last_name_reading,
    users.first_name,
    users.first_name_reading,
    users.display_name,
    users.contact_email,
    users.phone_number,
    users.is_verified,
    users.is_email_verified,
    COALESCE(
        array_agg(DISTINCT user_login_ids.login_id) FILTER (WHERE user_login_ids.login_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS login_ids,
    COALESCE(
        array_agg(DISTINCT user_roles.role) FILTER (WHERE user_roles.role IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS roles,
    COALESCE(
        array_agg(DISTINCT user_permissions.permission) FILTER (WHERE user_permissions.permission IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS permissions,
    COALESCE(
        array_agg(DISTINCT circle_user.circle_id) FILTER (WHERE circle_user.circle_id IS NOT NULL),
        ARRAY[]::text[]
    )::text[] AS circle_ids
FROM users
LEFT JOIN user_login_ids ON user_login_ids.user_id = users.id
LEFT JOIN user_roles ON user_roles.user_id = users.id
LEFT JOIN user_permissions ON user_permissions.user_id = users.id
LEFT JOIN circle_user ON circle_user.user_id = users.id
WHERE ($1::text = '' OR
    users.id ILIKE '%' || $1 || '%' OR
    users.display_name ILIKE '%' || $1 || '%' OR
    users.last_name ILIKE '%' || $1 || '%' OR
    users.first_name ILIKE '%' || $1 || '%' OR
    users.contact_email ILIKE '%' || $1 || '%' OR
    EXISTS (SELECT 1 FROM user_login_ids AS li WHERE li.user_id = users.id AND li.login_id ILIKE '%' || $1 || '%')
)
GROUP BY users.id, users.last_name, users.last_name_reading, users.first_name, users.first_name_reading,
         users.display_name, users.contact_email, users.phone_number, users.is_verified, users.is_email_verified
ORDER BY users.id;

-- name: UpdateUserProfile :one
UPDATE users
SET last_name = $2,
    last_name_reading = $3,
    first_name = $4,
    first_name_reading = $5,
    contact_email = $6,
    phone_number = $7
WHERE id = $1
RETURNING id, last_name, last_name_reading, first_name, first_name_reading, display_name, contact_email, phone_number, password, is_verified, is_email_verified, created_at;
