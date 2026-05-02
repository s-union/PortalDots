-- +goose Up
-- Add performance indexes for frequently queried columns

-- circles.tags: GIN index for tag-based filtering
CREATE INDEX IF NOT EXISTS circles_tags_gin_idx ON circles USING GIN (tags);

-- circles.status: B-tree index for status-based filtering
CREATE INDEX IF NOT EXISTS circles_status_idx ON circles(status);

-- pages.viewable_tags: GIN index for tag-based page visibility filtering
CREATE INDEX IF NOT EXISTS pages_viewable_tags_gin_idx ON pages USING GIN (viewable_tags);

-- documents.is_public: B-tree index for public document queries
CREATE INDEX IF NOT EXISTS documents_is_public_idx ON documents(is_public);

-- +goose Down
DROP INDEX IF EXISTS circles_tags_gin_idx;
DROP INDEX IF EXISTS circles_status_idx;
DROP INDEX IF EXISTS pages_viewable_tags_gin_idx;
DROP INDEX IF EXISTS documents_is_public_idx;
