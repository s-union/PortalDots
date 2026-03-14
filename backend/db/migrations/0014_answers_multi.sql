-- +goose Up
ALTER TABLE answers
    DROP CONSTRAINT IF EXISTS answers_form_id_circle_id_key;

ALTER TABLE answers
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS answers_form_circle_updated_at_idx
    ON answers(form_id, circle_id, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS answers_form_updated_at_idx
    ON answers(form_id, updated_at DESC, id DESC);

-- +goose Down
DROP INDEX IF EXISTS answers_form_updated_at_idx;
DROP INDEX IF EXISTS answers_form_circle_updated_at_idx;

ALTER TABLE answers
    DROP COLUMN IF EXISTS created_at;

ALTER TABLE answers
    ADD CONSTRAINT answers_form_id_circle_id_key UNIQUE (form_id, circle_id);
