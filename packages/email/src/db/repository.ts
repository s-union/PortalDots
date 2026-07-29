import { and, count, eq, inArray, notInArray, or } from 'drizzle-orm'
import type { EmailDb } from './client'
import { emailJobChunks, emailJobs, type ChunkStatus, type JobStatus } from './schema'

function nowIso(): string {
  return new Date().toISOString()
}

export async function ensureJobRecord(
  db: EmailDb,
  job: {
    jobId: string
    template: string
    priority: 'high' | 'normal'
    payloadDigest: string
    subject: string
    recipientsCount: number
    chunkCount: number
  }
): Promise<void> {
  const now = nowIso()
  await db
    .insert(emailJobs)
    .values({ ...job, status: 'pending', createdAt: now, updatedAt: now })
    .onConflictDoNothing({ target: emailJobs.jobId })
}

export async function getJobShape(
  db: EmailDb,
  jobId: string
): Promise<
  | {
      template: string
      priority: 'high' | 'normal'
      payloadDigest: string
      subject: string
      recipientsCount: number
      chunkCount: number
    }
  | undefined
> {
  return db
    .select({
      template: emailJobs.template,
      priority: emailJobs.priority,
      recipientsCount: emailJobs.recipientsCount,
      chunkCount: emailJobs.chunkCount,
      payloadDigest: emailJobs.payloadDigest,
      subject: emailJobs.subject
    })
    .from(emailJobs)
    .where(eq(emailJobs.jobId, jobId))
    .get()
}

export async function listAcceptedChunks(db: EmailDb, jobId: string): Promise<Map<number, string>> {
  const rows = await db
    .select({ chunkIndex: emailJobChunks.chunkIndex, messageId: emailJobChunks.messageId })
    .from(emailJobChunks)
    .where(eq(emailJobChunks.jobId, jobId))
  return new Map(rows.map((row) => [row.chunkIndex, row.messageId]))
}

export async function createChunkRecord(
  db: EmailDb,
  chunk: {
    messageId: string
    jobId: string
    chunkIndex: number
    chunkCount: number
    recipientsCount: number
  }
): Promise<void> {
  const now = nowIso()
  await db
    .insert(emailJobChunks)
    .values({ ...chunk, status: 'queued', createdAt: now, updatedAt: now })
    .onConflictDoNothing({ target: emailJobChunks.messageId })
}

// Both transitions leave a job the consumer already advanced alone: a producer
// retry must never pull 'processing'/'sent' back to a producer-side status.
const notAdvancedByConsumer = (jobId: string) =>
  and(eq(emailJobs.jobId, jobId), notInArray(emailJobs.status, ['processing', 'sent']))

export async function markJobQueued(db: EmailDb, jobId: string): Promise<void> {
  await db
    .update(emailJobs)
    .set({ status: 'queued', updatedAt: nowIso(), lastError: null })
    .where(notAdvancedByConsumer(jobId))
}

export async function markEnqueueFailed(db: EmailDb, jobId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Unknown enqueue error'
  await db
    .update(emailJobs)
    .set({ status: 'enqueue_failed', updatedAt: nowIso(), lastError: message })
    .where(notAdvancedByConsumer(jobId))
}

export interface MessageStatus {
  jobStatus: JobStatus
  chunkStatus: ChunkStatus
  updatedAt: string
}

export async function ensureMessageRecord(
  db: EmailDb,
  job: {
    jobId: string
    messageId: string
    chunkIndex: number
    chunkCount: number
    template: string
    priority: 'high' | 'normal'
    payloadDigest?: string
    subject: string
    recipientsCount: number
  }
): Promise<void> {
  const now = nowIso()
  await db
    .insert(emailJobs)
    .values({
      jobId: job.jobId,
      status: 'pending',
      template: job.template,
      priority: job.priority,
      payloadDigest: job.payloadDigest ?? '',
      subject: job.subject,
      recipientsCount: job.recipientsCount,
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
      recipientsCount: job.recipientsCount,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoNothing()
}

export async function getMessageStatus(db: EmailDb, jobId: string, messageId: string): Promise<MessageStatus> {
  const row = await db
    .select({
      jobStatus: emailJobs.status,
      chunkStatus: emailJobChunks.status,
      updatedAt: emailJobChunks.updatedAt
    })
    .from(emailJobs)
    .innerJoin(emailJobChunks, eq(emailJobChunks.jobId, emailJobs.jobId))
    .where(and(eq(emailJobs.jobId, jobId), eq(emailJobChunks.messageId, messageId)))
    .get()

  if (!row) {
    throw new Error(`Email message record is missing: ${messageId}`)
  }
  return row
}

export async function tryClaimChunk(db: EmailDb, messageId: string, expectedUpdatedAt: string): Promise<boolean> {
  const result = await db
    .update(emailJobChunks)
    .set({ status: 'processing', updatedAt: nowIso(), lastError: null })
    .where(
      and(
        eq(emailJobChunks.messageId, messageId),
        or(
          inArray(emailJobChunks.status, ['queued', 'enqueue_failed']),
          and(eq(emailJobChunks.status, 'processing'), eq(emailJobChunks.updatedAt, expectedUpdatedAt))
        )
      )
    )

  return result.meta.changes === 1
}

export async function markMessageSent(db: EmailDb, jobId: string, messageId: string): Promise<void> {
  const now = nowIso()
  await db
    .update(emailJobChunks)
    .set({ status: 'sent', updatedAt: now, lastError: null })
    .where(eq(emailJobChunks.messageId, messageId))
  const [jobRow, sentChunks] = await Promise.all([
    db.select({ chunkCount: emailJobs.chunkCount }).from(emailJobs).where(eq(emailJobs.jobId, jobId)).get(),
    db
      .select({ count: count(emailJobChunks.messageId) })
      .from(emailJobChunks)
      .where(and(eq(emailJobChunks.jobId, jobId), eq(emailJobChunks.status, 'sent')))
      .get()
  ])
  if (!jobRow || sentChunks?.count !== jobRow.chunkCount) {
    return
  }
  await db
    .update(emailJobs)
    .set({ status: 'sent', updatedAt: now, lastError: null })
    .where(and(eq(emailJobs.jobId, jobId), notInArray(emailJobs.status, ['sent'])))
}

export async function markMessageFailed(db: EmailDb, jobId: string, messageId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Unknown send error'
  const now = nowIso()
  await db.batch([
    db
      .update(emailJobChunks)
      .set({ status: 'enqueue_failed', updatedAt: now, lastError: message })
      .where(and(eq(emailJobChunks.messageId, messageId), notInArray(emailJobChunks.status, ['sent']))),
    db
      .update(emailJobs)
      .set({ status: 'enqueue_failed', updatedAt: now, lastError: message })
      .where(and(eq(emailJobs.jobId, jobId), notInArray(emailJobs.status, ['processing', 'sent'])))
  ])
}
