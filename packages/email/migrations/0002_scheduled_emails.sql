CREATE TABLE scheduled_emails (
  group_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'fired', 'cancelled')),
  send_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX scheduled_emails_status_send_at_index ON scheduled_emails(status, send_at);
