-- +goose Up
ALTER TABLE scheduled_page_mails
    ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE scheduled_page_mails
    DROP CONSTRAINT scheduled_page_mails_status_check,
    ADD CONSTRAINT scheduled_page_mails_status_check
        CHECK (status IN ('pending', 'dispatching', 'sent', 'skipped', 'failed'));

-- +goose Down
ALTER TABLE scheduled_page_mails
    DROP CONSTRAINT scheduled_page_mails_status_check,
    ADD CONSTRAINT scheduled_page_mails_status_check
        CHECK (status IN ('pending', 'dispatching', 'sent', 'failed'));

ALTER TABLE scheduled_page_mails
    DROP COLUMN next_attempt_at;
