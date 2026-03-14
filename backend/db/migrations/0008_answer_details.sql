-- +goose Up
ALTER TABLE answer_uploads
    ADD COLUMN IF NOT EXISTS question_id text REFERENCES form_questions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS answer_uploads_form_circle_question_created_at_idx
    ON answer_uploads(form_id, circle_id, question_id, created_at DESC);

CREATE TABLE IF NOT EXISTS answer_details (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    answer_id text NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    form_id text NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    circle_id text NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    question_id text NOT NULL REFERENCES form_questions(id) ON DELETE CASCADE,
    value text NOT NULL,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS answer_details_form_circle_question_position_idx
    ON answer_details(form_id, circle_id, question_id, position ASC, created_at ASC);

-- +goose Down
DROP TABLE IF EXISTS answer_details;
DROP INDEX IF EXISTS answer_uploads_form_circle_question_created_at_idx;
ALTER TABLE answer_uploads
    DROP COLUMN IF EXISTS question_id;
