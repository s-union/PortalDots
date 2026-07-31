-- The old schema cannot prove payload identity for a retry. Abort before
-- changing the schema unless every legacy job and chunk is fully sent.
CREATE TABLE IF NOT EXISTS __email_payload_digest_drain_guard (id INTEGER);
CREATE TRIGGER IF NOT EXISTS __email_payload_digest_require_drain
BEFORE INSERT ON __email_payload_digest_drain_guard
WHEN EXISTS (
  SELECT 1
  FROM email_jobs AS jobs
  WHERE jobs.status <> 'sent'
     OR jobs.chunk_count <> (
       SELECT COUNT(*)
       FROM email_job_chunks AS chunks
       WHERE chunks.job_id = jobs.job_id
     )
     OR EXISTS (
       SELECT 1
       FROM email_job_chunks AS chunks
       WHERE chunks.job_id = jobs.job_id
         AND chunks.status <> 'sent'
     )
)
BEGIN
  SELECT RAISE(ABORT, 'drain incomplete legacy email jobs before applying migration 0002');
END;

INSERT INTO __email_payload_digest_drain_guard (id) VALUES (1);
DROP TRIGGER __email_payload_digest_require_drain;
DROP TABLE __email_payload_digest_drain_guard;

ALTER TABLE email_jobs ADD COLUMN payload_digest TEXT NOT NULL DEFAULT '';
