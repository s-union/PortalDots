-- +goose Up
CREATE TABLE IF NOT EXISTS answer_uploads (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    filename text NOT NULL,
    mime_type text NOT NULL,
    content bytea NOT NULL,
    size_bytes bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS answer_uploads_form_circle_created_at_idx
    ON answer_uploads(form_id, circle_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS answer_uploads;
