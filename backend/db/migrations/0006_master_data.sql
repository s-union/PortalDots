-- +goose Up
CREATE TABLE IF NOT EXISTS tags (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS places (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    name text NOT NULL,
    type integer NOT NULL,
    notes text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_categories (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    name text NOT NULL,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS contact_categories;
DROP TABLE IF EXISTS places;
DROP TABLE IF EXISTS tags;
