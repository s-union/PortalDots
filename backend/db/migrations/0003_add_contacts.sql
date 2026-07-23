-- +goose Up
CREATE TABLE contacts (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    category_id uuid NOT NULL,
    category_name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text NOT NULL,
    staff_mail_job_id text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contacts_owner_created_at_idx
    ON contacts(user_id, circle_id, created_at DESC, id DESC);

CREATE TABLE contact_attachments (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    contact_id uuid NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
    filename text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
    content bytea NOT NULL CHECK (
        octet_length(content) > 0
        AND octet_length(content) <= 5242880
        AND size_bytes = octet_length(content)
    ),
    download_token_hash bytea NOT NULL UNIQUE CHECK (octet_length(download_token_hash) = 32),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS contact_attachments;
DROP TABLE IF EXISTS contacts;
