-- name: ListBooths :many
SELECT place_id, circle_id
FROM booths
ORDER BY place_id ASC, circle_id ASC;

-- name: DeleteBoothsByPlace :exec
DELETE FROM booths
WHERE place_id = $1;

-- name: DeleteBoothsByCircle :exec
DELETE FROM booths
WHERE circle_id = $1;

-- name: AddCircleBooth :exec
INSERT INTO booths (place_id, circle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;
