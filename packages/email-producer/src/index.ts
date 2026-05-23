import { Hono, type Context } from 'hono'
import { z } from 'zod'

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

type Env = {
  HIGH_QUEUE: Queue<EmailJob>
  NORMAL_QUEUE: Queue<EmailJob>
  DB: D1Database
  AUTH_TOKEN: string
}

const MAX_RECIPIENTS_PER_MESSAGE = 50
const knownTemplates = ['markdown-notice', 'registration-verify', 'staff-auth-notice'] as const

function nowIso(): string {
  return new Date().toISOString()
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('SQLITE_CONSTRAINT') || error.message.includes('UNIQUE constraint'))
  )
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function checkAuth(c: Context<{ Bindings: Env }>): Response | null {
  const authHeader = c.req.header('Authorization')
  const expectedToken = c.env.AUTH_TOKEN
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return null
}

async function getExistingJobStatus(db: D1Database, jobId: string): Promise<string | null> {
  const row = await db.prepare('SELECT status FROM email_jobs WHERE job_id = ?').bind(jobId).first<{ status: string }>()
  return row?.status ?? null
}

async function createJobRecord(
  db: D1Database,
  job: {
    jobId: string
    template: string
    priority: EmailPriority
    subject: string
    recipientsCount: number
    chunkCount: number
  }
): Promise<{ created: true } | { created: false; status: string | null }> {
  const now = nowIso()
  try {
    await db
      .prepare(
        `INSERT INTO email_jobs (
          job_id, status, template, priority, subject, recipients_count, chunk_count, created_at, updated_at
        ) VALUES (?, 'queued', ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(job.jobId, job.template, job.priority, job.subject, job.recipientsCount, job.chunkCount, now, now)
      .run()
    return { created: true }
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error
    }
    return { created: false, status: await getExistingJobStatus(db, job.jobId) }
  }
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
      ) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)`
    )
    .bind(chunk.messageId, chunk.jobId, chunk.chunkIndex, chunk.chunkCount, chunk.recipientsCount, now, now)
    .run()
}

async function markJobQueued(db: D1Database, jobId: string): Promise<void> {
  await db
    .prepare("UPDATE email_jobs SET status = 'queued', updated_at = ?, last_error = NULL WHERE job_id = ?")
    .bind(nowIso(), jobId)
    .run()
}

async function markEnqueueFailed(
  db: D1Database,
  jobId: string,
  messageId: string | null,
  error: unknown
): Promise<void> {
  const message = error instanceof Error ? error.message : 'Unknown enqueue error'
  const now = nowIso()
  const statements = [
    db
      .prepare("UPDATE email_jobs SET status = 'enqueue_failed', updated_at = ?, last_error = ? WHERE job_id = ?")
      .bind(now, message, jobId)
  ]
  if (messageId) {
    statements.push(
      db
        .prepare(
          "UPDATE email_job_chunks SET status = 'enqueue_failed', updated_at = ?, last_error = ? WHERE message_id = ?"
        )
        .bind(now, message, messageId)
    )
  }
  await db.batch(statements)
}

const enqueueRequestSchema = z.object({
  jobId: z.string().min(1),
  template: z.enum(knownTemplates),
  priority: z.enum(['high', 'normal']).optional(),
  from: z.string().email(),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  body: z.string().optional(),
  variables: z.record(z.string(), z.string()).default({})
})

const app = new Hono<{ Bindings: Env }>()

app.post('/enqueue', async (c) => {
  const authError = checkAuth(c)
  if (authError) return authError

  const parseResult = enqueueRequestSchema.safeParse(await c.req.json())
  if (!parseResult.success) {
    return c.json({ error: 'Invalid request', issues: parseResult.error.issues }, 400)
  }

  const body = parseResult.data
  const recipients = Array.isArray(body.to) ? body.to : [body.to]
  if (recipients.length === 0) {
    return c.json({ error: 'No recipients' }, 400)
  }

  const priority = body.priority ?? 'normal'
  const queue = priority === 'high' ? c.env.HIGH_QUEUE : c.env.NORMAL_QUEUE

  const chunks = chunkArray(recipients, MAX_RECIPIENTS_PER_MESSAGE)
  const jobRecord = await createJobRecord(c.env.DB, {
    jobId: body.jobId,
    template: body.template,
    priority,
    subject: body.subject,
    recipientsCount: recipients.length,
    chunkCount: chunks.length
  })

  if (!jobRecord.created) {
    return c.json({
      success: true,
      jobId: body.jobId,
      priority,
      messageCount: 0,
      status: 'duplicate',
      existingStatus: jobRecord.status
    })
  }

  let currentMessageId: string | null = null
  try {
    for (const [index, chunk] of chunks.entries()) {
      currentMessageId = `${body.jobId}:${index}`
      await createChunkRecord(c.env.DB, {
        messageId: currentMessageId,
        jobId: body.jobId,
        chunkIndex: index,
        chunkCount: chunks.length,
        recipientsCount: chunk.length
      })
      await queue.send({
        jobId: body.jobId,
        messageId: currentMessageId,
        chunkIndex: index,
        chunkCount: chunks.length,
        template: body.template,
        priority,
        from: body.from,
        to: chunk,
        subject: body.subject,
        body: body.body ?? '',
        variables: body.variables
      })
    }
    await markJobQueued(c.env.DB, body.jobId)
  } catch (error) {
    await markEnqueueFailed(c.env.DB, body.jobId, currentMessageId, error)
    throw error
  }

  console.info('Email job queued', {
    jobId: body.jobId,
    template: body.template,
    priority,
    messageCount: chunks.length,
    recipientsCount: recipients.length
  })

  return c.json({
    success: true,
    jobId: body.jobId,
    priority,
    messageCount: chunks.length,
    status: 'queued'
  })
})

export default app
