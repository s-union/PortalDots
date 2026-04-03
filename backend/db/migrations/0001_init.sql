-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    display_name text NOT NULL,
    password text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_login_ids (
    login_id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS circles (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    name text NOT NULL,
    group_name text NOT NULL,
    participation_type_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pages (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    is_pinned boolean NOT NULL DEFAULT false,
    is_public boolean NOT NULL DEFAULT true,
    published_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pages_circle_id_published_at_idx
    ON pages(circle_id, published_at DESC);

CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text NOT NULL,
    is_public boolean NOT NULL DEFAULT true,
    filename text NOT NULL,
    mime_type text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forms (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text NOT NULL,
    is_public boolean NOT NULL DEFAULT true,
    is_open boolean NOT NULL DEFAULT true,
    open_at timestamptz NOT NULL,
    close_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS answers (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    body text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (form_id, circle_id)
);

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

-- +goose Down
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS forms;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS circles;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS user_login_ids;
DROP TABLE IF EXISTS users;
