CREATE TABLE email_jobs (
  job_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('queued', 'enqueue_failed', 'processing', 'sent')),
  template TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'normal')),
  subject TEXT NOT NULL,
  recipients_count INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_error TEXT
);

CREATE TABLE email_job_chunks (
  message_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES email_jobs(job_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'enqueue_failed', 'processing', 'sent')),
  recipients_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_error TEXT,
  UNIQUE (job_id, chunk_index)
);

CREATE INDEX email_job_chunks_job_id_status_index ON email_job_chunks(job_id, status);
