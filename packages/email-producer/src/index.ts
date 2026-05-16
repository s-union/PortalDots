import { Hono, type Context } from 'hono'
import { z } from 'zod'

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
  AUTH_TOKEN: string
}

const MAX_RECIPIENTS_PER_MESSAGE = 50
const knownTemplates = ['markdown-notice', 'registration-verify', 'staff-auth-notice'] as const

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
  template: z.enum(knownTemplates),
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
