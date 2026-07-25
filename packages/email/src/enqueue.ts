import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { sValidator } from '@hono/standard-validator'
import * as z from 'zod'

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
// deliberate: ~25k recipients worth of JSON; raise if a single job ever needs more
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
 * identical payload, which is what keeps `<jobId>:<index>` message ids stable.
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
    throw new HTTPException(500, { message: 'AUTH_TOKEN is not configured' })
  }
  return bearerAuth<{ Bindings: Env }>({ token })(c, next)
})

/**
 * Insert the job row in its initial `pending` state, meaning "no chunk has been
 * accepted by the queue yet". Idempotent: a retry of the same job id keeps the
 * row created by the previous attempt.
 */
async function ensureJobRecord(
  db: D1Database,
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
    .prepare(
      `INSERT INTO email_jobs (
        job_id, status, template, priority, subject, recipients_count, chunk_count, created_at, updated_at
      ) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO NOTHING`
    )
    .bind(job.jobId, job.template, job.priority, job.subject, job.recipientsCount, job.chunkCount, now, now)
    .run()
}

/**
 * Chunk indexes the queue has already accepted for this job. A chunk row is
 * only written after `queue.send` returned (or by the consumer, which can only
 * see a message the queue accepted), so its existence never over-reports.
 */
async function listAcceptedChunkIndexes(db: D1Database, jobId: string): Promise<Set<number>> {
  const { results } = await db
    .prepare('SELECT chunk_index FROM email_job_chunks WHERE job_id = ?')
    .bind(jobId)
    .all<{ chunk_index: unknown }>()
  const indexes = new Set<number>()
  for (const row of results) {
    if (typeof row.chunk_index === 'number') {
      indexes.add(row.chunk_index)
    }
  }
  return indexes
}

async function createChunkRecord(
  db: D1Database,
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
    .prepare(
      `INSERT INTO email_job_chunks (
        message_id, job_id, chunk_index, chunk_count, status, recipients_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)
      ON CONFLICT(message_id) DO NOTHING`
    )
    .bind(chunk.messageId, chunk.jobId, chunk.chunkIndex, chunk.chunkCount, chunk.recipientsCount, now, now)
    .run()
}

// Both transitions leave a job the consumer already advanced alone: a producer
// retry must never pull 'processing'/'sent' back to a producer-side status.
async function markJobQueued(db: D1Database, jobId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE email_jobs SET status = 'queued', updated_at = ?, last_error = NULL
       WHERE job_id = ? AND status NOT IN ('processing', 'sent')`
    )
    .bind(nowIso(), jobId)
    .run()
}

async function markEnqueueFailed(db: D1Database, jobId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Unknown enqueue error'
  await db
    .prepare(
      `UPDATE email_jobs SET status = 'enqueue_failed', updated_at = ?, last_error = ?
       WHERE job_id = ? AND status NOT IN ('processing', 'sent')`
    )
    .bind(nowIso(), message, jobId)
    .run()
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

  await ensureJobRecord(env.DB, {
    jobId: payload.jobId,
    template: payload.template,
    priority: payload.priority,
    subject: payload.subject,
    recipientsCount: payload.to.length,
    chunkCount: chunks.length
  })

  try {
    const accepted = await listAcceptedChunkIndexes(env.DB, payload.jobId)
    let sentCount = 0
    for (const [index, recipients] of chunks.entries()) {
      if (accepted.has(index)) {
        continue
      }
      const messageId = `${payload.jobId}:${index}`
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
      await createChunkRecord(env.DB, {
        messageId,
        jobId: payload.jobId,
        chunkIndex: index,
        chunkCount: chunks.length,
        recipientsCount: recipients.length
      })
      sentCount++
    }
    await markJobQueued(env.DB, payload.jobId)

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
    await markEnqueueFailed(env.DB, payload.jobId, error)
    throw error
  }
}

const enqueueRequestSchema = z.object({
  jobId: z.string().min(1),
  template: z.enum(knownTemplates),
  priority: z.enum(['high', 'normal']).optional(),
  from: z.string().email(),
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
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
