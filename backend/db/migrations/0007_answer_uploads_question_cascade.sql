-- answer_uploads.question_id previously used ON DELETE SET NULL. An upload
-- orphaned that way can never be replaced (AddUploadToAnswer matches on
-- question_id) and is unreachable from the question it belonged to, yet it
-- stays listed and downloadable. This switches the FK to ON DELETE CASCADE
-- so deleting a form upload question also deletes every uploaded file
-- submitted for it, and removes the orphans already created by the old
-- behavior. This permanently destroys submitted participant files.

-- +goose Up
DELETE FROM answer_uploads WHERE question_id IS NULL;

ALTER TABLE answer_uploads
    DROP CONSTRAINT IF EXISTS answer_uploads_question_id_fkey,
    ADD CONSTRAINT answer_uploads_question_id_fkey
        FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE CASCADE;

-- +goose Down
-- The rows deleted by the Up migration are NOT recoverable by this Down migration.
ALTER TABLE answer_uploads
    DROP CONSTRAINT IF EXISTS answer_uploads_question_id_fkey,
    ADD CONSTRAINT answer_uploads_question_id_fkey
        FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE SET NULL;
