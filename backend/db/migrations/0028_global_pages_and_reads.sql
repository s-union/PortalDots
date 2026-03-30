-- +goose Up
ALTER TABLE pages
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE pages
SET created_at = COALESCE(created_at, published_at),
    updated_at = COALESCE(updated_at, published_at)
WHERE created_at IS NULL
   OR updated_at IS NULL;

ALTER TABLE pages
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT now();

DROP INDEX IF EXISTS pages_circle_id_published_at_idx;

ALTER TABLE pages
    DROP CONSTRAINT IF EXISTS pages_circle_id_fkey,
    DROP COLUMN IF EXISTS circle_id;

CREATE INDEX IF NOT EXISTS pages_updated_at_idx
    ON pages(updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS reads (
    page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (page_id, user_id)
);

ALTER TABLE mail_jobs
    DROP CONSTRAINT IF EXISTS mail_jobs_circle_id_fkey,
    ALTER COLUMN circle_id DROP NOT NULL;

ALTER TABLE mail_jobs
    ADD CONSTRAINT mail_jobs_circle_id_fkey
    FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE mail_jobs
    DROP CONSTRAINT IF EXISTS mail_jobs_circle_id_fkey,
    ALTER COLUMN circle_id SET NOT NULL;

ALTER TABLE mail_jobs
    ADD CONSTRAINT mail_jobs_circle_id_fkey
    FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;

DROP TABLE IF EXISTS reads;

DROP INDEX IF EXISTS pages_updated_at_idx;

ALTER TABLE pages
    ADD COLUMN IF NOT EXISTS circle_id text REFERENCES circles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS pages_circle_id_published_at_idx
    ON pages(circle_id, published_at DESC);

ALTER TABLE pages
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS created_at;
