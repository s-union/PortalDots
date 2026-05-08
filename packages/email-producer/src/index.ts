import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { desc } from 'drizzle-orm'
import { emailDeliveries } from './db/schema'
import { createDb } from './db/client'

type EmailPriority = 'high' | 'normal'

export interface EmailJob {
  jobId: string
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

const enqueueRequestSchema = z.object({
  jobId: z.string().min(1),
  template: z.string().min(1),
  priority: z.enum(['high', 'normal']).optional(),
  from: z.string().email(),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  body: z.string().optional(),
  variables: z.record(z.string()).default({})
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
  for (const chunk of chunks) {
    await queue.send({
      jobId: body.jobId,
      template: body.template,
      priority,
      from: body.from,
      to: chunk,
      subject: body.subject,
      body: body.body ?? '',
      variables: body.variables
    })
  }

  return c.json({
    success: true,
    jobId: body.jobId,
    priority,
    messageCount: chunks.length,
    status: 'queued'
  })
})

app.get('/deliveries', async (c) => {
  const authError = checkAuth(c)
  if (authError) return authError

  const db = createDb(c.env.DB)
  const rows = await db.select().from(emailDeliveries).orderBy(desc(emailDeliveries.sentAt))

  // Group by jobId to present one entry per mail job
  const grouped = new Map<
    string,
    {
      jobId: string
      template: string
      subject: string
      body: string
      recipients: string[]
      sentAt: string
    }
  >()

  for (const row of rows) {
    const existing = grouped.get(row.jobId)
    if (existing) {
      existing.recipients.push(row.recipient)
    } else {
      grouped.set(row.jobId, {
        jobId: row.jobId,
        template: row.template,
        subject: row.subject,
        body: row.body,
        recipients: [row.recipient],
        sentAt: row.sentAt.toISOString()
      })
    }
  }

  return c.json({
    deliveries: Array.from(grouped.values())
  })
})

app.delete('/deliveries', async (c) => {
  const authError = checkAuth(c)
  if (authError) return authError

  const db = createDb(c.env.DB)
  await db.delete(emailDeliveries)

  return c.json({ success: true })
})

export default app
