import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, onTestFinished } from 'vitest'

const initialMigration = readFileSync(
  fileURLToPath(new URL('../../migrations/0001_email_job_status.sql', import.meta.url).href),
  'utf8'
)
const digestMigration = readFileSync(
  fileURLToPath(new URL('../../migrations/0002_email_job_payload_digest.sql', import.meta.url).href),
  'utf8'
)

function createLegacyDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec(initialMigration)
  onTestFinished(() => db.close())
  return db
}

function insertLegacyJob(db: DatabaseSync, status: string, chunkCount = 1): void {
  db.prepare(
    `INSERT INTO email_jobs (
      job_id, status, template, priority, subject, recipients_count,
      chunk_count, created_at, updated_at
    ) VALUES (?, ?, 'markdown-notice', 'normal', 'Subject', 1, ?, 'now', 'now')`
  ).run('legacy-job', status, chunkCount)
}

function insertLegacyChunk(db: DatabaseSync, status: string): void {
  db.prepare(
    `INSERT INTO email_job_chunks (
      message_id, job_id, chunk_index, chunk_count, status,
      recipients_count, created_at, updated_at
    ) VALUES ('legacy-message', 'legacy-job', 0, 1, ?, 1, 'now', 'now')`
  ).run(status)
}

function hasPayloadDigestColumn(db: DatabaseSync): boolean {
  const columns = db.prepare('PRAGMA table_info(email_jobs)').all() as { name: string }[]
  return columns.some((column) => column.name === 'payload_digest')
}

describe('0002_email_job_payload_digest migration', () => {
  it.each(['pending', 'queued', 'enqueue_failed', 'processing'])(
    'aborts while a legacy %s job is incomplete',
    (status) => {
      const db = createLegacyDatabase()
      insertLegacyJob(db, status)

      expect(() => db.exec(digestMigration)).toThrow(/drain incomplete legacy email jobs/)
      expect(hasPayloadDigestColumn(db)).toBe(false)
    }
  )

  it('aborts when a sent legacy job has missing chunks', () => {
    const db = createLegacyDatabase()
    insertLegacyJob(db, 'sent')

    expect(() => db.exec(digestMigration)).toThrow(/drain incomplete legacy email jobs/)
    expect(hasPayloadDigestColumn(db)).toBe(false)
  })

  it('aborts when a sent legacy job has an unsent chunk', () => {
    const db = createLegacyDatabase()
    insertLegacyJob(db, 'sent')
    insertLegacyChunk(db, 'enqueue_failed')

    expect(() => db.exec(digestMigration)).toThrow(/drain incomplete legacy email jobs/)
    expect(hasPayloadDigestColumn(db)).toBe(false)
  })

  it('migrates fully sent legacy jobs', () => {
    const db = createLegacyDatabase()
    insertLegacyJob(db, 'sent')
    insertLegacyChunk(db, 'sent')

    expect(() => db.exec(digestMigration)).not.toThrow()
    expect(hasPayloadDigestColumn(db)).toBe(true)
    expect(db.prepare("SELECT payload_digest FROM email_jobs WHERE job_id = 'legacy-job'").get()).toEqual({
      payload_digest: ''
    })
  })
})
