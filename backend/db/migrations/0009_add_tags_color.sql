-- Circle tags are used heavily for filtering and scoping, but they all render
-- identically. Add a colour token so staff can tell categories apart at a
-- glance. A stable named-palette token is stored instead of a raw CSS value;
-- the server validates the palette and the CHECK constraint guards the
-- database. Existing rows keep the default, so nothing breaks on migration.

-- +goose Up
ALTER TABLE tags
    ADD COLUMN color text NOT NULL DEFAULT 'gray',
    ADD CONSTRAINT tags_color_check
        CHECK (color IN ('gray', 'red', 'orange', 'green', 'blue', 'purple'));

-- +goose Down
ALTER TABLE tags
    DROP CONSTRAINT IF EXISTS tags_color_check,
    DROP COLUMN IF EXISTS color;
