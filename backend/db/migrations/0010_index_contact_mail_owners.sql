-- +goose Up
-- +goose StatementBegin
CREATE FUNCTION mail_history_owner_ids(header text, structured_prefix text, legacy_prefix text)
RETURNS text[]
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT coalesce(array_agg(owner_id) FILTER (WHERE owner_id IS NOT NULL), '{}'::text[])
    FROM (
        SELECT CASE
            WHEN starts_with(line, structured_prefix)
                THEN substr(line, char_length(structured_prefix) + 1)
            WHEN starts_with(line, legacy_prefix)
                THEN substring(line FROM '\(([^()]*)\)$')
        END AS owner_id
        FROM unnest(string_to_array(header, E'\n')) AS lines(line)
    ) AS owners;
$$;
-- +goose StatementEnd

ALTER TABLE outbound_mails
    ADD COLUMN contact_user_ids text[] GENERATED ALWAYS AS (
        mail_history_owner_ids(split_part(body, E'\n\n', 1), 'from_user_id: ', 'from: ')
    ) STORED,
    ADD COLUMN contact_circle_ids text[] GENERATED ALWAYS AS (
        mail_history_owner_ids(split_part(body, E'\n\n', 1), 'circle_id: ', 'circle: ')
    ) STORED;

CREATE INDEX outbound_mails_contact_owners_idx
    ON outbound_mails USING gin (contact_user_ids, contact_circle_ids);

-- +goose Down
DROP INDEX outbound_mails_contact_owners_idx;
ALTER TABLE outbound_mails DROP COLUMN contact_user_ids, DROP COLUMN contact_circle_ids;
DROP FUNCTION mail_history_owner_ids(text, text, text);
