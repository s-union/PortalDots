-- +goose Up
ALTER TABLE forms
    ALTER COLUMN circle_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS participation_types (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    users_count_min integer NOT NULL DEFAULT 1,
    users_count_max integer NOT NULL DEFAULT 1,
    tags text[] NOT NULL DEFAULT '{}',
    form_id uuid NOT NULL UNIQUE REFERENCES forms(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE circles
    ADD COLUMN IF NOT EXISTS participation_type_id uuid REFERENCES participation_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS circles_participation_type_id_idx
    ON circles(participation_type_id);

-- +goose Down
DROP INDEX IF EXISTS circles_participation_type_id_idx;

ALTER TABLE circles
    DROP COLUMN IF EXISTS participation_type_id;

DROP TABLE IF EXISTS participation_types;

ALTER TABLE forms
    ALTER COLUMN circle_id SET NOT NULL;
