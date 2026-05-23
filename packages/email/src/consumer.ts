import { renderTemplate } from './templates'
import type { EmailJob } from './enqueue'

const PROCESSING_STALE_AFTER_MS = 15 * 60 * 1000

type JobStatus = 'queued' | 'enqueue_failed' | 'processing' | 'sent'

interface MessageStatus {
  jobStatus: JobStatus
  chunkStatus: JobStatus
  updatedAt: string
}

export interface ConsumerEnv {
  DB: D1Database
  EMAIL: SendEmail
}

function nowIso(): string {
  return new Date().toISOString()
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && Object.values(value).every((item) => typeof item === 'string')
}

const knownTemplates = new Set(['markdown-notice', 'registration-verify', 'staff-auth-notice'])

export function parseEmailJob(value: unknown): EmailJob | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const messageId = typeof candidate.messageId === 'string' ? candidate.messageId : candidate.jobId
  const chunkIndex =
    typeof candidate.chunkIndex === 'number' && Number.isInteger(candidate.chunkIndex) ? candidate.chunkIndex : 0
  const chunkCount =
    typeof candidate.chunkCount === 'number' && Number.isInteger(candidate.chunkCount) ? candidate.chunkCount : 1

  if (
    typeof candidate.jobId !== 'string' ||
    typeof messageId !== 'string' ||
    chunkIndex < 0 ||
    chunkCount < 1 ||
    chunkIndex >= chunkCount ||
    typeof candidate.template !== 'string' ||
    !knownTemplates.has(candidate.template) ||
    (candidate.priority !== 'high' && candidate.priority !== 'normal') ||
    typeof candidate.from !== 'string' ||
    !Array.isArray(candidate.to) ||
    !candidate.to.every((recipient) => typeof recipient === 'string') ||
    typeof candidate.subject !== 'string' ||
    typeof candidate.body !== 'string' ||
    !isStringRecord(candidate.variables)
  ) {
    return null
  }

  return {
    jobId: candidate.jobId,
    messageId,
    chunkIndex,
    chunkCount,
    template: candidate.template,
    priority: candidate.priority,
    from: candidate.from,
    to: candidate.to,
    subject: candidate.subject,
    body: candidate.body,
    variables: candidate.variables
  }
}

function isJobStatus(value: unknown): value is JobStatus {
  return value === 'queued' || value === 'enqueue_failed' || value === 'processing' || value === 'sent'
}

function isStaleProcessing(updatedAt: string): boolean {
  const updatedAtMs = Date.parse(updatedAt)
  return Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs > PROCESSING_STALE_AFTER_MS
}

async function ensureMessageRecord(db: D1Database, job: EmailJob): Promise<void> {
  const now = nowIso()
  await db
    .prepare(
      `INSERT OR IGNORE INTO email_jobs (
        job_id, status, template, priority, subject, recipients_count, chunk_count, created_at, updated_at
      ) VALUES (?, 'queued', ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(job.jobId, job.template, job.priority, job.subject, job.to.length, job.chunkCount, now, now)
    .run()
  await db
    .prepare(
      `INSERT OR IGNORE INTO email_job_chunks (
        message_id, job_id, chunk_index, chunk_count, status, recipients_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)`
    )
    .bind(job.messageId, job.jobId, job.chunkIndex, job.chunkCount, job.to.length, now, now)
    .run()
}

async function getMessageStatus(db: D1Database, job: EmailJob): Promise<MessageStatus> {
  const row = await db
    .prepare(
      `SELECT
        email_jobs.status AS job_status,
        email_job_chunks.status AS chunk_status,
        email_job_chunks.updated_at AS chunk_updated_at
      FROM email_jobs
      JOIN email_job_chunks ON email_job_chunks.job_id = email_jobs.job_id
      WHERE email_jobs.job_id = ? AND email_job_chunks.message_id = ?`
    )
    .bind(job.jobId, job.messageId)
    .first<{ job_status: unknown; chunk_status: unknown; chunk_updated_at: unknown }>()

  if (
    !row ||
    !isJobStatus(row.job_status) ||
    !isJobStatus(row.chunk_status) ||
    typeof row.chunk_updated_at !== 'string'
  ) {
    return { jobStatus: 'queued', chunkStatus: 'queued', updatedAt: nowIso() }
  }

  return {
    jobStatus: row.job_status,
    chunkStatus: row.chunk_status,
    updatedAt: row.chunk_updated_at
  }
}

async function claimMessage(db: D1Database, job: EmailJob): Promise<'claimed' | 'skip' | 'retry'> {
  await ensureMessageRecord(db, job)
  const status = await getMessageStatus(db, job)
  if (status.jobStatus === 'sent' || status.chunkStatus === 'sent') {
    return 'skip'
  }
  if (status.chunkStatus === 'processing' && !isStaleProcessing(status.updatedAt)) {
    return 'retry'
  }

  const result = await db
    .prepare(
      `UPDATE email_job_chunks
      SET status = 'processing', updated_at = ?, last_error = NULL
      WHERE message_id = ?
        AND (
          status IN ('queued', 'enqueue_failed')
          OR (status = 'processing' AND updated_at = ?)
        )`
    )
    .bind(nowIso(), job.messageId, status.updatedAt)
    .run()

  return result.meta.changes === 1 ? 'claimed' : 'retry'
}

async function markMessageSent(db: D1Database, job: EmailJob): Promise<void> {
  const now = nowIso()
  await db
    .prepare("UPDATE email_job_chunks SET status = 'sent', updated_at = ?, last_error = NULL WHERE message_id = ?")
    .bind(now, job.messageId)
    .run()
  await db
    .prepare(
      `UPDATE email_jobs
      SET status = 'sent', updated_at = ?, last_error = NULL
      WHERE job_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM email_job_chunks
          WHERE job_id = ? AND status != 'sent'
        )`
    )
    .bind(now, job.jobId, job.jobId)
    .run()
}

async function markMessageFailed(db: D1Database, job: EmailJob, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Unknown send error'
  const now = nowIso()
  await db.batch([
    db
      .prepare(
        "UPDATE email_job_chunks SET status = 'enqueue_failed', updated_at = ?, last_error = ? WHERE message_id = ?"
      )
      .bind(now, message, job.messageId),
    db
      .prepare("UPDATE email_jobs SET status = 'enqueue_failed', updated_at = ?, last_error = ? WHERE job_id = ?")
      .bind(now, message, job.jobId)
  ])
}

export async function queueHandler(batch: MessageBatch<unknown>, env: ConsumerEnv): Promise<void> {
  for (const message of batch.messages) {
    try {
      const job = parseEmailJob(message.body)
      if (!job) {
        console.error('Invalid email job payload')
        message.ack()
        continue
      }

      if (job.to.length === 0) {
        message.ack()
        continue
      }

      const claim = await claimMessage(env.DB, job)
      if (claim === 'skip') {
        message.ack()
        continue
      }
      if (claim === 'retry') {
        message.retry()
        continue
      }

      // Render template once per message
      const { html, text } = await renderTemplate(job.template, job.variables)

      // Send all pending recipients in one call (enqueue guarantees max 50)
      await env.EMAIL.send({
        to: job.to,
        from: job.from,
        subject: job.subject,
        html,
        text
      })

      console.info('Email job sent', {
        jobId: job.jobId,
        template: job.template,
        priority: job.priority,
        recipientsCount: job.to.length
      })

      try {
        await markMessageSent(env.DB, job)
      } catch (error) {
        console.error('Failed to mark email job as sent:', error)
      }
      message.ack()
    } catch (error) {
      console.error('Failed to process email job:', error)
      const job = parseEmailJob(message.body)
      if (job) {
        try {
          await markMessageFailed(env.DB, job, error)
        } catch (markError) {
          console.error('Failed to mark email job as failed:', markError)
        }
      }
      message.retry()
    }
  }
}
