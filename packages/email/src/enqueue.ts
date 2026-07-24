import { Hono, type Context } from 'hono'
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
const knownTemplates = ['markdown-notice', 'registration-verify', 'staff-auth-notice'] as const

type ScheduledStatus = 'scheduled' | 'fired' | 'cancelled'

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

export interface DispatchResult {
  status: 'queued' | 'duplicate'
  jobId: string
  priority: EmailPriority
  messageCount: number
  existingStatus?: string | null
}

/**
 * Chunk the recipients, record the job/chunks in D1 and push the chunks onto the
 * appropriate queue. Shared by the immediate `/enqueue` path and the scheduled
 * fire path (cron).
 */
export async function dispatchJob(env: Env, payload: DispatchPayload): Promise<DispatchResult> {
  const queue = payload.priority === 'high' ? env.HIGH_QUEUE : env.NORMAL_QUEUE
  const chunks = chunkArray(payload.to, MAX_RECIPIENTS_PER_MESSAGE)

  const jobRecord = await createJobRecord(env.DB, {
    jobId: payload.jobId,
    template: payload.template,
    priority: payload.priority,
    subject: payload.subject,
    recipientsCount: payload.to.length,
    chunkCount: chunks.length
  })

  if (!jobRecord.created) {
    return {
      status: 'duplicate',
      jobId: payload.jobId,
      priority: payload.priority,
      messageCount: 0,
      existingStatus: jobRecord.status
    }
  }

  let currentMessageId: string | null = null
  try {
    for (const [index, chunk] of chunks.entries()) {
      currentMessageId = `${payload.jobId}:${index}`
      await createChunkRecord(env.DB, {
        messageId: currentMessageId,
        jobId: payload.jobId,
        chunkIndex: index,
        chunkCount: chunks.length,
        recipientsCount: chunk.length
      })
      await queue.send({
        jobId: payload.jobId,
        messageId: currentMessageId,
        chunkIndex: index,
        chunkCount: chunks.length,
        template: payload.template,
        priority: payload.priority,
        from: payload.from,
        to: chunk,
        subject: payload.subject,
        body: payload.body,
        variables: payload.variables
      })
    }
    await markJobQueued(env.DB, payload.jobId)
  } catch (error) {
    await markEnqueueFailed(env.DB, payload.jobId, currentMessageId, error)
    throw error
  }

  console.info('Email job queued', {
    jobId: payload.jobId,
    template: payload.template,
    priority: payload.priority,
    messageCount: chunks.length,
    recipientsCount: payload.to.length
  })

  return {
    status: 'queued',
    jobId: payload.jobId,
    priority: payload.priority,
    messageCount: chunks.length
  }
}

const emailPayloadShape = {
  jobId: z.string().min(1),
  template: z.enum(knownTemplates),
  priority: z.enum(['high', 'normal']).optional(),
  from: z.string().email(),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  body: z.string().optional(),
  variables: z.record(z.string(), z.string()).default({})
}

const enqueueRequestSchema = z.object(emailPayloadShape)

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

interface ScheduledEmailRow {
  group_id: string
  status: ScheduledStatus
  send_at: string
  payload: string
}

async function getScheduledEmail(db: D1Database, groupId: string): Promise<ScheduledEmailRow | null> {
  return db
    .prepare('SELECT group_id, status, send_at, payload FROM scheduled_emails WHERE group_id = ?')
    .bind(groupId)
    .first<ScheduledEmailRow>()
}

async function upsertScheduledEmail(
  db: D1Database,
  record: { groupId: string; sendAt: string; payload: string }
): Promise<void> {
  const now = nowIso()
  await db
    .prepare(
      `INSERT INTO scheduled_emails (group_id, status, send_at, payload, created_at, updated_at)
       VALUES (?, 'scheduled', ?, ?, ?, ?)
       ON CONFLICT(group_id) DO UPDATE SET status = 'scheduled', send_at = excluded.send_at,
         payload = excluded.payload, updated_at = excluded.updated_at`
    )
    .bind(record.groupId, record.sendAt, record.payload, now, now)
    .run()
}

async function cancelScheduledEmail(db: D1Database, groupId: string): Promise<void> {
  await db
    .prepare(
      "UPDATE scheduled_emails SET status = 'cancelled', updated_at = ? WHERE group_id = ? AND status = 'scheduled'"
    )
    .bind(nowIso(), groupId)
    .run()
}

async function markScheduledFired(db: D1Database, groupId: string): Promise<void> {
  await db
    .prepare("UPDATE scheduled_emails SET status = 'fired', updated_at = ? WHERE group_id = ?")
    .bind(nowIso(), groupId)
    .run()
}

export async function listDueScheduledEmails(db: D1Database, now: string): Promise<ScheduledEmailRow[]> {
  return db
    .prepare(
      "SELECT group_id, status, send_at, payload FROM scheduled_emails WHERE status = 'scheduled' AND send_at <= ?"
    )
    .bind(now)
    .all<ScheduledEmailRow>()
    .then((result) => result.results)
}

/**
 * Fire every scheduled email whose send_at has passed. Invoked by the Cron
 * trigger. Each fired payload is dispatched through the normal queue path.
 */
export async function fireDueScheduledEmails(env: Env): Promise<number> {
  const due = await listDueScheduledEmails(env.DB, nowIso())
  let fired = 0
  for (const row of due) {
    try {
      const payload = JSON.parse(row.payload) as DispatchPayload
      await dispatchJob(env, payload)
      await markScheduledFired(env.DB, row.group_id)
      fired++
    } catch (error) {
      console.error('Failed to fire scheduled email', { groupId: row.group_id, error })
    }
  }
  return fired
}

const syncRequestSchema = z.object({
  groupId: z.string().min(1),
  isPublic: z.boolean(),
  sendEmails: z.boolean(),
  sendAt: z.string().optional(),
  payload: z.object(emailPayloadShape).nullable()
})

export type SyncOutcome = 'scheduled' | 'updated' | 'dispatched' | 'cancelled' | 'unchanged'

function isFutureSend(sendAt: string | undefined): boolean {
  if (!sendAt) {
    return false
  }
  const sendTime = Date.parse(sendAt)
  return Number.isFinite(sendTime) && sendTime > Date.now()
}

export const app = new Hono<{ Bindings: Env }>()

app.post('/enqueue', async (c) => {
  const authError = checkAuth(c)
  if (authError) return authError

  const parseResult = enqueueRequestSchema.safeParse(await c.req.json())
  if (!parseResult.success) {
    return c.json({ error: 'Invalid request', issues: parseResult.error.issues }, 400)
  }

  const payload = toDispatchPayload(parseResult.data)
  if (payload.to.length === 0) {
    return c.json({ error: 'No recipients' }, 400)
  }

  try {
    const result = await dispatchJob(c.env, payload)
    return c.json({ success: true, ...result })
  } catch (error) {
    console.error('Email enqueue failed', { jobId: payload.jobId, error })
    return c.json({ error: 'Enqueue failed' }, 500)
  }
})

app.post('/scheduled/sync', async (c) => {
  const authError = checkAuth(c)
  if (authError) return authError

  const parseResult = syncRequestSchema.safeParse(await c.req.json())
  if (!parseResult.success) {
    return c.json({ error: 'Invalid request', issues: parseResult.error.issues }, 400)
  }

  const request = parseResult.data
  let outcome: SyncOutcome = 'unchanged'

  if (!request.isPublic) {
    await cancelScheduledEmail(c.env.DB, request.groupId)
    outcome = 'cancelled'
    return c.json({ success: true, status: outcome })
  }

  const existing = await getScheduledEmail(c.env.DB, request.groupId)
  const hasPending = existing?.status === 'scheduled'

  if (hasPending && request.payload) {
    await upsertScheduledEmail(c.env.DB, {
      groupId: request.groupId,
      sendAt: request.sendAt ?? nowIso(),
      payload: JSON.stringify(toDispatchPayload(request.payload))
    })
    outcome = 'updated'
    return c.json({ success: true, status: outcome })
  }

  if (request.sendEmails && request.payload) {
    const payload = toDispatchPayload(request.payload)
    if (payload.to.length === 0) {
      return c.json({ error: 'No recipients' }, 400)
    }
    if (isFutureSend(request.sendAt)) {
      await upsertScheduledEmail(c.env.DB, {
        groupId: request.groupId,
        sendAt: request.sendAt as string,
        payload: JSON.stringify(payload)
      })
      outcome = 'scheduled'
      return c.json({ success: true, status: outcome })
    }
    try {
      await dispatchJob(c.env, payload)
      outcome = 'dispatched'
    } catch (error) {
      console.error('Email dispatch failed', { groupId: request.groupId, error })
      return c.json({ error: 'Dispatch failed' }, 500)
    }
  }

  return c.json({ success: true, status: outcome })
})
