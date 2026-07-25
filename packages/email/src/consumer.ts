import { and, eq, inArray, ne, notExists, or } from 'drizzle-orm'
import { createDb, type EmailDb } from './db/client'
import { emailJobChunks, emailJobs, type ChunkStatus, type JobStatus } from './db/schema'
import { renderTemplate } from './templates'
import type { EmailJob } from './enqueue'

const PROCESSING_STALE_AFTER_MS = 15 * 60 * 1000

interface MessageStatus {
  jobStatus: JobStatus
  chunkStatus: ChunkStatus
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

function isStaleProcessing(updatedAt: string): boolean {
  const updatedAtMs = Date.parse(updatedAt)
  return Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs > PROCESSING_STALE_AFTER_MS
}

async function ensureMessageRecord(db: EmailDb, job: EmailJob): Promise<void> {
  const now = nowIso()
  await db
    .insert(emailJobs)
    .values({
      jobId: job.jobId,
      // 'pending': this message was accepted by the queue, but nothing here proves
      // the producer got the job's other chunks onto the queue.
      status: 'pending',
      template: job.template,
      priority: job.priority,
      subject: job.subject,
      recipientsCount: job.to.length,
      chunkCount: job.chunkCount,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoNothing()
  await db
    .insert(emailJobChunks)
    .values({
      messageId: job.messageId,
      jobId: job.jobId,
      chunkIndex: job.chunkIndex,
      chunkCount: job.chunkCount,
      status: 'queued',
      recipientsCount: job.to.length,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoNothing()
}

async function getMessageStatus(db: EmailDb, job: EmailJob): Promise<MessageStatus> {
  const row = await db
    .select({
      jobStatus: emailJobs.status,
      chunkStatus: emailJobChunks.status,
      updatedAt: emailJobChunks.updatedAt
    })
    .from(emailJobs)
    .innerJoin(emailJobChunks, eq(emailJobChunks.jobId, emailJobs.jobId))
    .where(and(eq(emailJobs.jobId, job.jobId), eq(emailJobChunks.messageId, job.messageId)))
    .get()

  return row ?? { jobStatus: 'queued', chunkStatus: 'queued', updatedAt: nowIso() }
}

async function claimMessage(db: EmailDb, job: EmailJob): Promise<'claimed' | 'skip' | 'retry'> {
  await ensureMessageRecord(db, job)
  const status = await getMessageStatus(db, job)
  if (status.jobStatus === 'sent' || status.chunkStatus === 'sent') {
    return 'skip'
  }
  if (status.chunkStatus === 'processing' && !isStaleProcessing(status.updatedAt)) {
    return 'retry'
  }

  const result = await db
    .update(emailJobChunks)
    .set({ status: 'processing', updatedAt: nowIso(), lastError: null })
    .where(
      and(
        eq(emailJobChunks.messageId, job.messageId),
        or(
          inArray(emailJobChunks.status, ['queued', 'enqueue_failed']),
          and(eq(emailJobChunks.status, 'processing'), eq(emailJobChunks.updatedAt, status.updatedAt))
        )
      )
    )

  return result.meta.changes === 1 ? 'claimed' : 'retry'
}

async function markMessageSent(db: EmailDb, job: EmailJob): Promise<void> {
  const now = nowIso()
  await db
    .update(emailJobChunks)
    .set({ status: 'sent', updatedAt: now, lastError: null })
    .where(eq(emailJobChunks.messageId, job.messageId))
  await db
    .update(emailJobs)
    .set({ status: 'sent', updatedAt: now, lastError: null })
    .where(
      and(
        eq(emailJobs.jobId, job.jobId),
        notExists(
          db
            .select({ messageId: emailJobChunks.messageId })
            .from(emailJobChunks)
            .where(and(eq(emailJobChunks.jobId, job.jobId), ne(emailJobChunks.status, 'sent')))
        )
      )
    )
}

async function markMessageFailed(db: EmailDb, job: EmailJob, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Unknown send error'
  const now = nowIso()
  await db.batch([
    db
      .update(emailJobChunks)
      .set({ status: 'enqueue_failed', updatedAt: now, lastError: message })
      .where(eq(emailJobChunks.messageId, job.messageId)),
    db
      .update(emailJobs)
      .set({ status: 'enqueue_failed', updatedAt: now, lastError: message })
      .where(eq(emailJobs.jobId, job.jobId))
  ])
}

export async function queueHandler(batch: MessageBatch<unknown>, env: ConsumerEnv): Promise<void> {
  const db = createDb(env.DB)
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

      const claim = await claimMessage(db, job)
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
        await markMessageSent(db, job)
      } catch (error) {
        console.error('Failed to mark email job as sent:', error)
      }
      message.ack()
    } catch (error) {
      console.error('Failed to process email job:', error)
      const job = parseEmailJob(message.body)
      if (job) {
        try {
          await markMessageFailed(db, job, error)
        } catch (markError) {
          console.error('Failed to mark email job as failed:', markError)
        }
      }
      message.retry()
    }
  }
}
