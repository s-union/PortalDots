-- +goose Up
CREATE TABLE IF NOT EXISTS form_questions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    form_id text NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    name text NOT NULL DEFAULT '',
    description text NOT NULL DEFAULT '',
    type text NOT NULL,
    is_required boolean NOT NULL DEFAULT false,
    number_min integer,
    number_max integer,
    allowed_types text NOT NULL DEFAULT '',
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    priority integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_questions_form_id_priority_idx
    ON form_questions(form_id, priority ASC, created_at ASC);

-- +goose Down
DROP TABLE IF EXISTS form_questions;
