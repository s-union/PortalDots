-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── users ──
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    display_name text NOT NULL,
    password text NOT NULL,
    is_verified boolean NOT NULL DEFAULT false,
    last_name text NOT NULL DEFAULT '',
    last_name_reading text NOT NULL DEFAULT '',
    first_name text NOT NULL DEFAULT '',
    first_name_reading text NOT NULL DEFAULT '',
    contact_email text NOT NULL DEFAULT '',
    phone_number text NOT NULL DEFAULT '',
    is_email_verified boolean NOT NULL DEFAULT false,
    is_univemail_verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_contact_email_lower_unique_idx
    ON users (lower(contact_email))
    WHERE contact_email <> '';

-- ── user_login_ids ──
CREATE TABLE IF NOT EXISTS user_login_ids (
    login_id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_login_ids_login_id_lower_idx
    ON user_login_ids (lower(login_id));

-- ── user_roles ──
CREATE TABLE IF NOT EXISTS user_roles (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL,
    PRIMARY KEY (user_id, role)
);

-- ── user_permissions ──
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, permission)
);

CREATE INDEX IF NOT EXISTS user_permissions_permission_idx
    ON user_permissions (permission);

-- ── circles (participation_type_id FK は participation_types 作成後に追加) ──
CREATE TABLE IF NOT EXISTS circles (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    name text NOT NULL,
    name_yomi text NOT NULL DEFAULT '',
    group_name text NOT NULL,
    group_name_yomi text NOT NULL DEFAULT '',
    participation_type_name text NOT NULL,
    participation_type_id uuid,
    tags text[] NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending',
    status_reason text NOT NULL DEFAULT '',
    status_set_at timestamptz,
    status_set_by uuid REFERENCES users(id) ON DELETE SET NULL,
    invitation_token text UNIQUE,
    submitted_at timestamptz,
    notes text NOT NULL DEFAULT '',
    can_change_group_name boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── circle_user ──
CREATE TABLE IF NOT EXISTS circle_user (
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_leader boolean NOT NULL DEFAULT false,
    PRIMARY KEY (circle_id, user_id)
);

-- ── forms ──
CREATE TABLE IF NOT EXISTS forms (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    circle_id uuid REFERENCES circles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text NOT NULL,
    is_public boolean NOT NULL DEFAULT true,
    is_open boolean NOT NULL DEFAULT true,
    open_at timestamptz NOT NULL,
    close_at timestamptz NOT NULL,
    max_answers integer NOT NULL DEFAULT 1,
    answerable_tags text[] NOT NULL DEFAULT '{}',
    confirmation_message text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── participation_types ──
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
    ADD CONSTRAINT circles_participation_type_id_fkey
    FOREIGN KEY (participation_type_id) REFERENCES participation_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS circles_participation_type_id_idx
    ON circles(participation_type_id);

CREATE INDEX IF NOT EXISTS circles_status_idx
    ON circles(status);

CREATE INDEX IF NOT EXISTS circles_tags_gin_idx
    ON circles USING GIN (tags);

-- ── pages ──
CREATE TABLE IF NOT EXISTS pages (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    title text NOT NULL,
    body text NOT NULL,
    is_pinned boolean NOT NULL DEFAULT false,
    is_public boolean NOT NULL DEFAULT true,
    notes text NOT NULL DEFAULT '',
    viewable_tags text[] NOT NULL DEFAULT '{}',
    document_ids text[] NOT NULL DEFAULT '{}',
    published_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pages_updated_at_idx
    ON pages(updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS pages_viewable_tags_gin_idx
    ON pages USING GIN (viewable_tags);

-- ── reads ──
CREATE TABLE IF NOT EXISTS reads (
    page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (page_id, user_id)
);

-- ── documents ──
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text NOT NULL,
    is_public boolean NOT NULL DEFAULT true,
    viewable_tags text[] NOT NULL DEFAULT '{}',
    notes text NOT NULL DEFAULT '',
    is_important boolean NOT NULL DEFAULT false,
    filename text NOT NULL,
    mime_type text NOT NULL,
    content bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_is_public_idx
    ON documents(is_public);

CREATE INDEX IF NOT EXISTS documents_viewable_tags_gin_idx
    ON documents USING GIN (viewable_tags);

-- ── document_reads ──
CREATE TABLE IF NOT EXISTS document_reads (
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (document_id, user_id)
);

-- ── form_questions ──
CREATE TABLE IF NOT EXISTS form_questions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
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

-- ── answers ──
CREATE TABLE IF NOT EXISTS answers (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS answers_form_circle_updated_at_idx
    ON answers(form_id, circle_id, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS answers_form_updated_at_idx
    ON answers(form_id, updated_at DESC, id DESC);

-- ── answer_details ──
CREATE TABLE IF NOT EXISTS answer_details (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES form_questions(id) ON DELETE CASCADE,
    value text NOT NULL,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS answer_details_form_circle_question_position_idx
    ON answer_details(form_id, circle_id, question_id, position ASC, created_at ASC);

-- ── answer_uploads ──
CREATE TABLE IF NOT EXISTS answer_uploads (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    question_id uuid REFERENCES form_questions(id) ON DELETE SET NULL,
    filename text NOT NULL,
    mime_type text NOT NULL,
    content bytea NOT NULL,
    size_bytes bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS answer_uploads_form_circle_created_at_idx
    ON answer_uploads(form_id, circle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS answer_uploads_form_circle_question_created_at_idx
    ON answer_uploads(form_id, circle_id, question_id, created_at DESC);

-- ── sessions ──
CREATE TABLE IF NOT EXISTS sessions (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token text NOT NULL,
    current_circle_id uuid REFERENCES circles(id) ON DELETE SET NULL,
    staff_authorized boolean NOT NULL DEFAULT false,
    staff_verify_code text NOT NULL DEFAULT '',
    staff_verify_expires timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── activity_logs ──
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    circle_id text NOT NULL DEFAULT '',
    summary text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx
    ON activity_logs(created_at DESC);

-- ── outbound_mails ──
CREATE TABLE IF NOT EXISTS outbound_mails (
    job_id text PRIMARY KEY,
    template text NOT NULL,
    priority text NOT NULL CHECK (priority IN ('high', 'normal')),
    from_address text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    recipients text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbound_mails_created_at_idx
    ON outbound_mails(created_at DESC, job_id DESC);

-- ── tags ──
CREATE TABLE IF NOT EXISTS tags (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── places ──
CREATE TABLE IF NOT EXISTS places (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    name text NOT NULL,
    type integer NOT NULL,
    notes text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── contact_categories ──
CREATE TABLE IF NOT EXISTS contact_categories (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    name text NOT NULL,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── booths ──
CREATE TABLE IF NOT EXISTS booths (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (place_id, circle_id)
);

CREATE INDEX IF NOT EXISTS booths_place_id_idx ON booths(place_id);
CREATE INDEX IF NOT EXISTS booths_circle_id_idx ON booths(circle_id);

-- ── pending_registrations ──
CREATE TABLE IF NOT EXISTS pending_registrations (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    univemail text NOT NULL,
    student_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pending_registrations_univemail_lower_unique_idx
    ON pending_registrations (lower(univemail));

CREATE INDEX IF NOT EXISTS pending_registrations_expires_at_idx
    ON pending_registrations (expires_at);

-- +goose Down
DROP TABLE IF EXISTS pending_registrations;
DROP TABLE IF EXISTS booths;
DROP TABLE IF EXISTS contact_categories;
DROP TABLE IF EXISTS places;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS outbound_mails;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS answer_uploads;
DROP TABLE IF EXISTS answer_details;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS form_questions;
DROP TABLE IF EXISTS document_reads;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS reads;
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS circle_user;
DROP TABLE IF EXISTS circles;
DROP TABLE IF EXISTS participation_types;
DROP TABLE IF EXISTS forms;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS user_login_ids;
DROP TABLE IF EXISTS users;
