-- +goose Up
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_circle_id_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_circle_id_fkey;
ALTER TABLE forms DROP CONSTRAINT IF EXISTS forms_circle_id_fkey;
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_form_id_fkey;
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_circle_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_current_circle_id_fkey;
ALTER TABLE mail_jobs DROP CONSTRAINT IF EXISTS mail_jobs_circle_id_fkey;
ALTER TABLE answer_uploads DROP CONSTRAINT IF EXISTS answer_uploads_answer_id_fkey;
ALTER TABLE answer_uploads DROP CONSTRAINT IF EXISTS answer_uploads_form_id_fkey;
ALTER TABLE answer_uploads DROP CONSTRAINT IF EXISTS answer_uploads_circle_id_fkey;
ALTER TABLE answer_uploads DROP CONSTRAINT IF EXISTS answer_uploads_question_id_fkey;
ALTER TABLE form_questions DROP CONSTRAINT IF EXISTS form_questions_form_id_fkey;
ALTER TABLE answer_details DROP CONSTRAINT IF EXISTS answer_details_answer_id_fkey;
ALTER TABLE answer_details DROP CONSTRAINT IF EXISTS answer_details_form_id_fkey;
ALTER TABLE answer_details DROP CONSTRAINT IF EXISTS answer_details_circle_id_fkey;
ALTER TABLE answer_details DROP CONSTRAINT IF EXISTS answer_details_question_id_fkey;
ALTER TABLE circle_user DROP CONSTRAINT IF EXISTS circle_user_circle_id_fkey;
ALTER TABLE participation_types DROP CONSTRAINT IF EXISTS participation_types_form_id_fkey;
ALTER TABLE circles DROP CONSTRAINT IF EXISTS circles_participation_type_id_fkey;
ALTER TABLE booths DROP CONSTRAINT IF EXISTS booths_place_id_fkey;
ALTER TABLE booths DROP CONSTRAINT IF EXISTS booths_circle_id_fkey;

ALTER TABLE participation_types
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN form_id TYPE uuid USING form_id::uuid;

ALTER TABLE circles
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN participation_type_id TYPE uuid USING NULLIF(participation_type_id, '')::uuid;

ALTER TABLE pages
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN circle_id TYPE uuid USING circle_id::uuid,
    ALTER COLUMN document_ids DROP DEFAULT,
    ALTER COLUMN document_ids TYPE uuid[] USING document_ids::uuid[],
    ALTER COLUMN document_ids SET DEFAULT '{}'::uuid[];

ALTER TABLE documents
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN circle_id TYPE uuid USING circle_id::uuid;

ALTER TABLE forms
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN circle_id TYPE uuid USING NULLIF(circle_id, '')::uuid;

ALTER TABLE answers
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN form_id TYPE uuid USING form_id::uuid,
    ALTER COLUMN circle_id TYPE uuid USING circle_id::uuid;

ALTER TABLE sessions
    ALTER COLUMN current_circle_id TYPE uuid USING NULLIF(current_circle_id, '')::uuid;

ALTER TABLE mail_jobs
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN circle_id TYPE uuid USING circle_id::uuid;

ALTER TABLE activity_logs
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE tags
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE places
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE contact_categories
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE form_questions
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN form_id TYPE uuid USING form_id::uuid;

ALTER TABLE answer_uploads
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN answer_id TYPE uuid USING answer_id::uuid,
    ALTER COLUMN form_id TYPE uuid USING form_id::uuid,
    ALTER COLUMN circle_id TYPE uuid USING circle_id::uuid,
    ALTER COLUMN question_id TYPE uuid USING question_id::uuid;

ALTER TABLE answer_details
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN answer_id TYPE uuid USING answer_id::uuid,
    ALTER COLUMN form_id TYPE uuid USING form_id::uuid,
    ALTER COLUMN circle_id TYPE uuid USING circle_id::uuid,
    ALTER COLUMN question_id TYPE uuid USING question_id::uuid;

ALTER TABLE circle_user
    ALTER COLUMN circle_id TYPE uuid USING circle_id::uuid;

ALTER TABLE booths
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ALTER COLUMN place_id TYPE uuid USING place_id::uuid,
    ALTER COLUMN circle_id TYPE uuid USING circle_id::uuid;

ALTER TABLE pending_registrations
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE pages
    ADD CONSTRAINT pages_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE documents
    ADD CONSTRAINT documents_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE forms
    ADD CONSTRAINT forms_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE answers
    ADD CONSTRAINT answers_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    ADD CONSTRAINT answers_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE sessions
    ADD CONSTRAINT sessions_current_circle_id_fkey FOREIGN KEY (current_circle_id) REFERENCES circles(id) ON DELETE SET NULL;
ALTER TABLE mail_jobs
    ADD CONSTRAINT mail_jobs_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE form_questions
    ADD CONSTRAINT form_questions_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE answer_uploads
    ADD CONSTRAINT answer_uploads_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_uploads_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_uploads_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_uploads_question_id_fkey FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE SET NULL;
ALTER TABLE answer_details
    ADD CONSTRAINT answer_details_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_details_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_details_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_details_question_id_fkey FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE CASCADE;
ALTER TABLE circle_user
    ADD CONSTRAINT circle_user_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE participation_types
    ADD CONSTRAINT participation_types_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE circles
    ADD CONSTRAINT circles_participation_type_id_fkey FOREIGN KEY (participation_type_id) REFERENCES participation_types(id) ON DELETE SET NULL;
ALTER TABLE booths
    ADD CONSTRAINT booths_place_id_fkey FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    ADD CONSTRAINT booths_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;

-- +goose Down
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_circle_id_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_circle_id_fkey;
ALTER TABLE forms DROP CONSTRAINT IF EXISTS forms_circle_id_fkey;
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_form_id_fkey;
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_circle_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_current_circle_id_fkey;
ALTER TABLE mail_jobs DROP CONSTRAINT IF EXISTS mail_jobs_circle_id_fkey;
ALTER TABLE answer_uploads DROP CONSTRAINT IF EXISTS answer_uploads_answer_id_fkey;
ALTER TABLE answer_uploads DROP CONSTRAINT IF EXISTS answer_uploads_form_id_fkey;
ALTER TABLE answer_uploads DROP CONSTRAINT IF EXISTS answer_uploads_circle_id_fkey;
ALTER TABLE answer_uploads DROP CONSTRAINT IF EXISTS answer_uploads_question_id_fkey;
ALTER TABLE form_questions DROP CONSTRAINT IF EXISTS form_questions_form_id_fkey;
ALTER TABLE answer_details DROP CONSTRAINT IF EXISTS answer_details_answer_id_fkey;
ALTER TABLE answer_details DROP CONSTRAINT IF EXISTS answer_details_form_id_fkey;
ALTER TABLE answer_details DROP CONSTRAINT IF EXISTS answer_details_circle_id_fkey;
ALTER TABLE answer_details DROP CONSTRAINT IF EXISTS answer_details_question_id_fkey;
ALTER TABLE circle_user DROP CONSTRAINT IF EXISTS circle_user_circle_id_fkey;
ALTER TABLE participation_types DROP CONSTRAINT IF EXISTS participation_types_form_id_fkey;
ALTER TABLE circles DROP CONSTRAINT IF EXISTS circles_participation_type_id_fkey;
ALTER TABLE booths DROP CONSTRAINT IF EXISTS booths_place_id_fkey;
ALTER TABLE booths DROP CONSTRAINT IF EXISTS booths_circle_id_fkey;

ALTER TABLE pending_registrations
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE booths
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN place_id TYPE text USING place_id::text,
    ALTER COLUMN circle_id TYPE text USING circle_id::text;

ALTER TABLE circle_user
    ALTER COLUMN circle_id TYPE text USING circle_id::text;

ALTER TABLE answer_details
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN answer_id TYPE text USING answer_id::text,
    ALTER COLUMN form_id TYPE text USING form_id::text,
    ALTER COLUMN circle_id TYPE text USING circle_id::text,
    ALTER COLUMN question_id TYPE text USING question_id::text;

ALTER TABLE answer_uploads
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN answer_id TYPE text USING answer_id::text,
    ALTER COLUMN form_id TYPE text USING form_id::text,
    ALTER COLUMN circle_id TYPE text USING circle_id::text,
    ALTER COLUMN question_id TYPE text USING question_id::text;

ALTER TABLE form_questions
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN form_id TYPE text USING form_id::text;

ALTER TABLE contact_categories
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE places
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE tags
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE activity_logs
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE mail_jobs
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN circle_id TYPE text USING circle_id::text;

ALTER TABLE sessions
    ALTER COLUMN current_circle_id TYPE text USING current_circle_id::text;

ALTER TABLE answers
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN form_id TYPE text USING form_id::text,
    ALTER COLUMN circle_id TYPE text USING circle_id::text;

ALTER TABLE forms
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN circle_id TYPE text USING circle_id::text;

ALTER TABLE documents
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN circle_id TYPE text USING circle_id::text;

ALTER TABLE pages
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN circle_id TYPE text USING circle_id::text,
    ALTER COLUMN document_ids DROP DEFAULT,
    ALTER COLUMN document_ids TYPE text[] USING document_ids::text[],
    ALTER COLUMN document_ids SET DEFAULT '{}';

ALTER TABLE circles
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN participation_type_id TYPE text USING participation_type_id::text;

ALTER TABLE participation_types
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN form_id TYPE text USING form_id::text;

ALTER TABLE pages
    ADD CONSTRAINT pages_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE documents
    ADD CONSTRAINT documents_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE forms
    ADD CONSTRAINT forms_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE answers
    ADD CONSTRAINT answers_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    ADD CONSTRAINT answers_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE sessions
    ADD CONSTRAINT sessions_current_circle_id_fkey FOREIGN KEY (current_circle_id) REFERENCES circles(id) ON DELETE SET NULL;
ALTER TABLE mail_jobs
    ADD CONSTRAINT mail_jobs_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE form_questions
    ADD CONSTRAINT form_questions_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE answer_uploads
    ADD CONSTRAINT answer_uploads_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_uploads_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_uploads_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_uploads_question_id_fkey FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE SET NULL;
ALTER TABLE answer_details
    ADD CONSTRAINT answer_details_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_details_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_details_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_details_question_id_fkey FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE CASCADE;
ALTER TABLE circle_user
    ADD CONSTRAINT circle_user_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
ALTER TABLE participation_types
    ADD CONSTRAINT participation_types_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE circles
    ADD CONSTRAINT circles_participation_type_id_fkey FOREIGN KEY (participation_type_id) REFERENCES participation_types(id) ON DELETE SET NULL;
ALTER TABLE booths
    ADD CONSTRAINT booths_place_id_fkey FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    ADD CONSTRAINT booths_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
