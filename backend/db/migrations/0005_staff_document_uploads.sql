-- +goose Up
ALTER TABLE documents
    ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE documents
    ALTER COLUMN content TYPE bytea USING convert_to(content, 'UTF8');

-- +goose Down
ALTER TABLE documents
    ALTER COLUMN content TYPE text USING convert_from(content, 'UTF8');

ALTER TABLE documents
    ALTER COLUMN id DROP DEFAULT;
