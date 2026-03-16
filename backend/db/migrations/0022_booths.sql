-- +goose Up
CREATE TABLE IF NOT EXISTS booths (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    place_id text NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    circle_id text NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (place_id, circle_id)
);

CREATE INDEX IF NOT EXISTS booths_place_id_idx ON booths(place_id);
CREATE INDEX IF NOT EXISTS booths_circle_id_idx ON booths(circle_id);

-- +goose Down
DROP TABLE IF EXISTS booths;
