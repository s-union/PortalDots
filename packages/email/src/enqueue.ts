import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { sValidator } from '@hono/standard-validator'
import { and, eq, notInArray } from 'drizzle-orm'
import * as z from 'zod'
import { createDb, type EmailDb } from './db/client'
import { emailJobChunks, emailJobs } from './db/schema'

type EmailPriority = 'high' | 'normal'

export interface EmailJob {
  jobId: string
  messageId: string
  chunkIndex: number
  chunkCount: number
  template: string
  priority: EmailPriority
  from: string
  to: string[]
  subject: string
  body: string
  variables: Record<string, string>
}

export type Env = {
  HIGH_QUEUE: Queue<EmailJob>
  NORMAL_QUEUE: Queue<EmailJob>
  DB: D1Database
  AUTH_TOKEN: string
}

const MAX_RECIPIENTS_PER_MESSAGE = 50
// deliberate: cap queue subrequests at ten per producer request
const MAX_RECIPIENTS_PER_JOB = 500
const MAX_BODY_BYTES = 1024 * 1024
const knownTemplates = ['markdown-notice', 'registration-verify', 'staff-auth-notice'] as const

interface DispatchPayload {
  jobId: string
  template: (typeof knownTemplates)[number]
  priority: EmailPriority
  from: string
  to: string[]
  subject: string
  body: string
  variables: Record<string, string>
}

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Split recipients into fixed-size chunks. Pure function of `arr`: chunk `i`
 * holds the same recipients on every retry as long as the caller replays the
 * identical payload, which is what keeps content-addressed message ids stable.
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

const auth = createMiddleware<{ Bindings: Env }>((c, next) => {
  const token = c.env.AUTH_TOKEN
  if (!token) {
    console.error('AUTH_TOKEN is not configured')
    throw new HTTPException(500, { message: 'Internal Server Error' })
  }
  return bearerAuth<{ Bindings: Env }>({ token })(c, next)
})

/**
 * Insert the job row in its initial `pending` state, meaning "no chunk has been
 * accepted by the queue yet". Idempotent: a retry of the same job id keeps the
 * row created by the previous attempt.
 */
async function ensureJobRecord(
  db: EmailDb,
  job: {
    jobId: string
    template: string
    priority: EmailPriority
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

/**
 * Chunk indexes the queue has already accepted for this job. A chunk row is
 * only written after `queue.send` returned (or by the consumer, which can only
 * see a message the queue accepted), so its existence never over-reports.
 */
async function listAcceptedChunks(db: EmailDb, jobId: string): Promise<Map<number, string>> {
  const rows = await db
    .select({ chunkIndex: emailJobChunks.chunkIndex, messageId: emailJobChunks.messageId })
    .from(emailJobChunks)
    .where(eq(emailJobChunks.jobId, jobId))
  return new Map(rows.map((row) => [row.chunkIndex, row.messageId]))
}

async function validateJobShape(
  db: EmailDb,
  jobId: string,
  recipientsCount: number,
  chunkCount: number
): Promise<void> {
  const row = await db
    .select({ recipientsCount: emailJobs.recipientsCount, chunkCount: emailJobs.chunkCount })
    .from(emailJobs)
    .where(eq(emailJobs.jobId, jobId))
    .get()
  if (!row || row.recipientsCount !== recipientsCount || row.chunkCount !== chunkCount) {
    throw new HTTPException(409, { message: 'Email job recipient set changed' })
  }
}

async function chunkMessageId(jobId: string, chunkIndex: number, recipients: string[]): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(recipients)))
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${jobId}:${chunkIndex}:${hash}`
}

async function createChunkRecord(
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

async function markJobQueued(db: EmailDb, jobId: string): Promise<void> {
  await db
    .update(emailJobs)
    .set({ status: 'queued', updatedAt: nowIso(), lastError: null })
    .where(notAdvancedByConsumer(jobId))
}

async function markEnqueueFailed(db: EmailDb, jobId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Unknown enqueue error'
  await db
    .update(emailJobs)
    .set({ status: 'enqueue_failed', updatedAt: nowIso(), lastError: message })
    .where(notAdvancedByConsumer(jobId))
}

interface DispatchResult {
  status: 'queued'
  jobId: string
  priority: EmailPriority
  messageCount: number
}

/**
 * Record the job in D1 and push every chunk that the queue has not accepted yet.
 * Safe to call repeatedly with the same `jobId`: chunks already accepted are
 * skipped, so a retry completes a partially enqueued job instead of duplicating
 * or abandoning it. Returns once the queue holds every chunk of the job.
 */
async function dispatchJob(env: Env, payload: DispatchPayload): Promise<DispatchResult> {
  const queue = payload.priority === 'high' ? env.HIGH_QUEUE : env.NORMAL_QUEUE
  const chunks = chunkArray(payload.to, MAX_RECIPIENTS_PER_MESSAGE)
  const db = createDb(env.DB)

  await ensureJobRecord(db, {
    jobId: payload.jobId,
    template: payload.template,
    priority: payload.priority,
    subject: payload.subject,
    recipientsCount: payload.to.length,
    chunkCount: chunks.length
  })

  try {
    await validateJobShape(db, payload.jobId, payload.to.length, chunks.length)
    const messageIds = await Promise.all(
      chunks.map((recipients, index) => chunkMessageId(payload.jobId, index, recipients))
    )
    const accepted = await listAcceptedChunks(db, payload.jobId)
    let sentCount = 0
    for (const [index, recipients] of chunks.entries()) {
      const messageId = messageIds[index]
      const acceptedMessageId = accepted.get(index)
      if (acceptedMessageId !== undefined && acceptedMessageId !== messageId) {
        throw new HTTPException(409, { message: 'Recipients changed for an accepted email chunk' })
      }
      if (acceptedMessageId !== undefined) {
        continue
      }
      await queue.send({
        jobId: payload.jobId,
        messageId,
        chunkIndex: index,
        chunkCount: chunks.length,
        template: payload.template,
        priority: payload.priority,
        from: payload.from,
        to: recipients,
        subject: payload.subject,
        body: payload.body,
        variables: payload.variables
      })
      await createChunkRecord(db, {
        messageId,
        jobId: payload.jobId,
        chunkIndex: index,
        chunkCount: chunks.length,
        recipientsCount: recipients.length
      })
      sentCount++
    }
    await markJobQueued(db, payload.jobId)

    console.info('Email job queued', {
      jobId: payload.jobId,
      template: payload.template,
      priority: payload.priority,
      messageCount: chunks.length,
      sentCount,
      recipientsCount: payload.to.length
    })

    return {
      status: 'queued',
      jobId: payload.jobId,
      priority: payload.priority,
      messageCount: chunks.length
    }
  } catch (error) {
    if (error instanceof HTTPException && error.status === 409) {
      throw error
    }
    await markEnqueueFailed(db, payload.jobId, error)
    throw error
  }
}

const enqueueRequestSchema = z.object({
  jobId: z.string().min(1),
  template: z.enum(knownTemplates),
  priority: z.enum(['high', 'normal']).optional(),
  from: z.string().email(),
  to: z.union([z.string().email(), z.array(z.string().email()).min(1).max(MAX_RECIPIENTS_PER_JOB)]),
  subject: z.string().min(1),
  body: z.string().optional(),
  variables: z.record(z.string(), z.string()).default({})
})

function toDispatchPayload(body: z.infer<typeof enqueueRequestSchema>): DispatchPayload {
  return {
    jobId: body.jobId,
    template: body.template,
    priority: body.priority ?? 'normal',
    from: body.from,
    to: Array.isArray(body.to) ? body.to : [body.to],
    subject: body.subject,
    body: body.body ?? '',
    variables: body.variables
  }
}

/** Hono app exposing the email producer API (`/enqueue`). */
export const app = new Hono<{ Bindings: Env }>()
  .use('*', auth)
  .post(
    '/enqueue',
    bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.json({ error: 'Request body too large' }, 413) }),
    sValidator('json', enqueueRequestSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid request', issues: result.error }, 400)
      }
    }),
    async (c) => {
      const payload = toDispatchPayload(c.req.valid('json'))
      try {
        const result = await dispatchJob(c.env, payload)
        return c.json({ success: true, ...result })
      } catch (error) {
        console.error('Email enqueue failed', { jobId: payload.jobId, error })
        if (error instanceof HTTPException) {
          throw error
        }
        throw new HTTPException(500, { message: 'Enqueue failed' })
      }
    }
  )
  .onError((error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse()
    }
    if (error instanceof SyntaxError) {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    console.error('Unhandled error', { error })
    return c.json({ error: 'Internal Server Error' }, 500)
  })
