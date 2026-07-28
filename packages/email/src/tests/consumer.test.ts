import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest'

vi.mock('../templates', () => ({
  renderTemplate: vi.fn()
}))

import { queueHandler } from '../consumer'
import { emailJobChunks } from '../db/schema'
import { renderTemplate } from '../templates'
import { TestD1Database } from './helpers/d1'

interface MessageLike {
  body: unknown
  ack: () => Promise<void>
  retry: () => Promise<void>
}

function createMessageBatch(messages: MessageLike[]) {
  return {
    messages,
    queue: 'test-queue',
    metadata: {},
    retryAll: vi.fn(),
    ackAll: vi.fn()
  }
}

function createEnv(emailSend = vi.fn().mockResolvedValue(undefined), db = new TestD1Database()) {
  return {
    DB: db.drizzle,
    EMAIL: { send: emailSend }
  }
}

describe('email queue consumer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(renderTemplate).mockResolvedValue({ html: '<h1>Test</h1>', text: 'Test' })
  })

  it('sends to all pending recipients', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const emailSend = vi.fn()

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          messageId: 'job-1:0',
          chunkIndex: 0,
          chunkCount: 1,
          template: 'markdown-notice',
          priority: 'normal',
          to: ['a@example.com', 'b@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          body: 'Test body',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await queueHandler(batch.messages as never, createEnv(emailSend) as never)
    expect(emailSend).toHaveBeenCalledWith({
      to: ['a@example.com', 'b@example.com'],
      from: 'sender@example.com',
      subject: 'Test',
      html: '<h1>Test</h1>',
      text: 'Test'
    })
    expect(ack).toHaveBeenCalled()
  })

  it('retries on send failure', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const emailSend = vi.fn().mockRejectedValue(new Error('Send failed'))

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          messageId: 'job-1:0',
          chunkIndex: 0,
          chunkCount: 1,
          template: 'markdown-notice',
          priority: 'normal',
          to: ['a@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          body: 'Test body',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await queueHandler(batch.messages as never, createEnv(emailSend) as never)
    expect(retry).toHaveBeenCalled()
    expect(ack).not.toHaveBeenCalled()
  })

  it('rejects when retry scheduling fails', async () => {
    const ack = vi.fn()
    const retryError = new Error('Retry failed')
    const retry = vi.fn().mockRejectedValue(retryError)
    const emailSend = vi.fn().mockRejectedValue(new Error('Send failed'))

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          messageId: 'job-1:0',
          chunkIndex: 0,
          chunkCount: 1,
          template: 'markdown-notice',
          priority: 'normal',
          to: ['a@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          body: 'Test body',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await expect(queueHandler(batch.messages as never, createEnv(emailSend) as never)).rejects.toBe(retryError)
    expect(ack).not.toHaveBeenCalled()
  })

  it('acks empty to array immediately', async () => {
    const ack = vi.fn()
    const retry = vi.fn()

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          messageId: 'job-1:0',
          chunkIndex: 0,
          chunkCount: 1,
          template: 'markdown-notice',
          priority: 'normal',
          to: [],
          from: 'sender@example.com',
          subject: 'Test',
          body: 'Test body',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await queueHandler(batch.messages as never, createEnv() as never)
    expect(ack).toHaveBeenCalled()
    expect(vi.mocked(renderTemplate)).not.toHaveBeenCalled()
  })

  it('acks invalid payload without retrying', async () => {
    const ack = vi.fn()
    const retry = vi.fn()

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          template: 'unknown-template'
        },
        ack,
        retry
      }
    ])

    await queueHandler(batch.messages as never, createEnv() as never)
    expect(ack).toHaveBeenCalled()
    expect(retry).not.toHaveBeenCalled()
    expect(vi.mocked(renderTemplate)).not.toHaveBeenCalled()
  })

  it('acks already sent chunk without sending again', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const emailSend = vi.fn()
    const db = new TestD1Database()
    await db.seedJob({ jobId: 'job-1', status: 'queued', chunkCount: 1 })
    await db.seedChunk({ messageId: 'job-1:0', jobId: 'job-1', chunkIndex: 0, status: 'sent' })

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          messageId: 'job-1:0',
          chunkIndex: 0,
          chunkCount: 1,
          template: 'markdown-notice',
          priority: 'normal',
          to: ['a@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          body: 'Test body',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await queueHandler(batch.messages as never, createEnv(emailSend, db) as never)
    expect(emailSend).not.toHaveBeenCalled()
    expect(ack).toHaveBeenCalled()
    expect(retry).not.toHaveBeenCalled()
  })

  it('retries a non-stale processing chunk without sending', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const emailSend = vi.fn()
    const db = new TestD1Database()
    await db.seedJob({ jobId: 'job-1', status: 'queued', chunkCount: 1 })
    await db.seedChunk({ messageId: 'job-1:0', jobId: 'job-1', chunkIndex: 0, status: 'processing' })

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          messageId: 'job-1:0',
          chunkIndex: 0,
          chunkCount: 1,
          template: 'markdown-notice',
          priority: 'normal',
          to: ['a@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          body: 'Test body',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await queueHandler(batch.messages as never, createEnv(emailSend, db) as never)
    expect(emailSend).not.toHaveBeenCalled()
    expect(retry).toHaveBeenCalled()
    expect(ack).not.toHaveBeenCalled()
  })

  it('reclaims a stale processing chunk and sends', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const emailSend = vi.fn()
    const db = new TestD1Database()
    await db.seedJob({ jobId: 'job-1', status: 'queued', chunkCount: 1 })
    await db.seedChunk({ messageId: 'job-1:0', jobId: 'job-1', chunkIndex: 0, status: 'processing' })
    await db.drizzle
      .update(emailJobChunks)
      .set({ updatedAt: new Date(Date.now() - 16 * 60 * 1000).toISOString() })
      .where(eq(emailJobChunks.messageId, 'job-1:0'))

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          messageId: 'job-1:0',
          chunkIndex: 0,
          chunkCount: 1,
          template: 'markdown-notice',
          priority: 'normal',
          to: ['a@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          body: 'Test body',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await queueHandler(batch.messages as never, createEnv(emailSend, db) as never)
    expect(emailSend).toHaveBeenCalledTimes(1)
    expect(ack).toHaveBeenCalled()
    expect(retry).not.toHaveBeenCalled()
  })

  it('does not roll a sent job back when a later chunk fails', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const db = new TestD1Database()
    await db.seedJob({ jobId: 'job-1', status: 'sent', chunkCount: 2, recipientsCount: 2 })
    await db.seedChunk({ messageId: 'job-1:0', jobId: 'job-1', chunkIndex: 0, status: 'sent' })
    await db.seedChunk({ messageId: 'job-1:1', jobId: 'job-1', chunkIndex: 1, status: 'queued' })
    const emailSend = vi.fn().mockRejectedValue(new Error('Send failed'))

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          messageId: 'job-1:1',
          chunkIndex: 1,
          chunkCount: 2,
          template: 'markdown-notice',
          priority: 'normal',
          to: ['b@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          body: 'Test body',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await queueHandler(batch.messages as never, createEnv(emailSend, db) as never)
    expect(await db.jobStatus('job-1')).toBe('sent')
    expect(retry).toHaveBeenCalled()
    expect(ack).not.toHaveBeenCalled()
  })

  it('acks sent email even when sent status update fails', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const db = new TestD1Database()
    // The mail leaves, then D1 goes down: every write after delivery fails,
    // including the one that records the chunk as sent.
    const emailSend = vi.fn().mockImplementation(() => db.breakWrites())

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          messageId: 'job-1:0',
          chunkIndex: 0,
          chunkCount: 1,
          template: 'markdown-notice',
          priority: 'normal',
          to: ['a@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          body: 'Test body',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await queueHandler(batch.messages as never, createEnv(emailSend, db) as never)
    expect(emailSend).toHaveBeenCalledTimes(1)
    // Proof the bookkeeping really failed, so the ack below is the "sent but
    // unrecorded" path rather than an ordinary success.
    expect(consoleError).toHaveBeenCalledWith('Failed to mark email job as sent:', expect.any(Error))
    expect(ack).toHaveBeenCalled()
    expect(retry).not.toHaveBeenCalled()
  })
})
