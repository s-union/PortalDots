import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { sValidator } from '@hono/standard-validator'
import * as z from 'zod'
import { type EmailDb } from './db/client'
import {
  createChunkRecord,
  ensureJobRecord,
  getJobShape,
  listAcceptedChunks,
  markEnqueueFailed,
  markJobQueued
} from './db/repository'
import type { JobQueue } from './ports'

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
  HIGH_QUEUE: JobQueue<EmailJob>
  NORMAL_QUEUE: JobQueue<EmailJob>
  DB: EmailDb
  AUTH_TOKEN: string
}

const MAX_RECIPIENTS_PER_MESSAGE = 1
const MAX_MESSAGES_PER_QUEUE_BATCH = 100
const MAX_QUEUE_MESSAGE_BYTES = 128_000
// Deliberate buffer below Cloudflare Queues' 256 KB serialized batch limit.
const MAX_QUEUE_BATCH_BYTES = 200_000
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

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return hash
}

async function payloadDigest(payload: DispatchPayload, chunks: string[][]): Promise<string> {
  const variables = Object.entries(payload.variables).sort(([left], [right]) => {
    if (left < right) return -1
    if (left > right) return 1
    return 0
  })
  return sha256Hex(
    JSON.stringify({
      version: 1,
      template: payload.template,
      priority: payload.priority,
      from: payload.from,
      subject: payload.subject,
      body: payload.body,
      variables,
      recipients: payload.to,
      chunking: {
        recipientsPerMessage: MAX_RECIPIENTS_PER_MESSAGE,
        chunks
      }
    })
  )
}

function chunkMessageId(jobId: string, chunkIndex: number, digest: string): string {
  return `${jobId}:${chunkIndex}:${digest}`
}

function encodedQueueMessageSize(message: EmailJob): number {
  return new TextEncoder().encode(JSON.stringify(message)).byteLength
}

function encodedQueueBatchEntrySize(message: EmailJob): number {
  return new TextEncoder().encode(JSON.stringify({ body: message })).byteLength
}

interface QueueBatch {
  messages: EmailJob[]
  batchable: boolean
}

function queueBatches(messages: readonly EmailJob[]): QueueBatch[] {
  const batches: QueueBatch[] = []
  let current: EmailJob[] = []
  let currentBytes = 0
  const flush = () => {
    if (current.length > 0) {
      batches.push({ messages: current, batchable: true })
      current = []
      currentBytes = 0
    }
  }

  for (const message of messages) {
    const messageBytes = encodedQueueBatchEntrySize(message)
    if (messageBytes > MAX_QUEUE_BATCH_BYTES) {
      flush()
      batches.push({ messages: [message], batchable: false })
      continue
    }
    if (
      current.length === MAX_MESSAGES_PER_QUEUE_BATCH ||
      (current.length > 0 && currentBytes + messageBytes > MAX_QUEUE_BATCH_BYTES)
    ) {
      flush()
    }
    current.push(message)
    currentBytes += messageBytes
  }
  flush()
  return batches
}

async function sendQueueMessages(queue: JobQueue<EmailJob>, batch: QueueBatch): Promise<void> {
  if (batch.batchable && queue.sendBatch) {
    await queue.sendBatch(batch.messages)
    return
  }
  for (const message of batch.messages) {
    await queue.send(message)
  }
}

interface DispatchResult {
  status: 'queued'
  jobId: string
  priority: EmailPriority
  messageCount: number
}

/**
 * Record the job and push every chunk that the queue has not accepted yet.
 * Safe to call repeatedly with the same `jobId`: chunks already accepted are
 * skipped, so a retry completes a partially enqueued job instead of duplicating
 * or abandoning it. Returns once the queue holds every chunk of the job.
 */
async function dispatchJob(env: Env, payload: DispatchPayload): Promise<DispatchResult> {
  const queue = payload.priority === 'high' ? env.HIGH_QUEUE : env.NORMAL_QUEUE
  const chunks = chunkArray(payload.to, MAX_RECIPIENTS_PER_MESSAGE)
  const db = env.DB
  const digest = await payloadDigest(payload, chunks)
  const messages = chunks.map(
    (recipients, chunkIndex): EmailJob => ({
      jobId: payload.jobId,
      messageId: chunkMessageId(payload.jobId, chunkIndex, digest),
      chunkIndex,
      chunkCount: chunks.length,
      template: payload.template,
      priority: payload.priority,
      from: payload.from,
      to: recipients,
      subject: payload.subject,
      body: payload.body,
      variables: payload.variables
    })
  )
  if (messages.some((message) => encodedQueueMessageSize(message) > MAX_QUEUE_MESSAGE_BYTES)) {
    throw new HTTPException(413, { message: 'Email queue message is too large' })
  }

  await ensureJobRecord(db, {
    jobId: payload.jobId,
    template: payload.template,
    priority: payload.priority,
    payloadDigest: digest,
    subject: payload.subject,
    recipientsCount: payload.to.length,
    chunkCount: chunks.length
  })

  try {
    const shape = await getJobShape(db, payload.jobId)
    if (
      !shape ||
      shape.template !== payload.template ||
      shape.priority !== payload.priority ||
      shape.subject !== payload.subject ||
      shape.recipientsCount !== payload.to.length ||
      shape.chunkCount !== chunks.length
    ) {
      throw new HTTPException(409, { message: 'Email job payload changed' })
    }
    if (shape.payloadDigest !== digest) {
      throw new HTTPException(409, { message: 'Email job payload changed' })
    }
    const accepted = await listAcceptedChunks(db, payload.jobId)

    const pending: EmailJob[] = []
    for (const message of messages) {
      const acceptedMessageId = accepted.get(message.chunkIndex)
      if (acceptedMessageId !== undefined && acceptedMessageId !== message.messageId) {
        throw new HTTPException(409, { message: 'Email job payload changed for an accepted chunk' })
      }
      if (acceptedMessageId !== undefined) {
        continue
      }
      pending.push(message)
    }

    for (const batch of queueBatches(pending)) {
      await sendQueueMessages(queue, batch)
      for (const message of batch.messages) {
        await createChunkRecord(db, {
          messageId: message.messageId,
          jobId: message.jobId,
          chunkIndex: message.chunkIndex,
          chunkCount: message.chunkCount,
          recipientsCount: message.to.length
        })
      }
    }
    await markJobQueued(db, payload.jobId)

    console.info('Email job queued', {
      jobId: payload.jobId,
      template: payload.template,
      priority: payload.priority,
      messageCount: chunks.length,
      sentCount: pending.length,
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
