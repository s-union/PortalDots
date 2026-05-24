import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../templates', () => ({
  renderTemplate: vi.fn()
}))

import { queueHandler } from '../consumer'
import { renderTemplate } from '../templates'
import { TestD1Database } from './helpers/d1'

interface MessageLike {
  body: unknown
  ack: () => void
  retry: () => void
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

function createEnv(emailSend = vi.fn().mockResolvedValue({ messageId: 'msg-1' }), db = new TestD1Database()) {
  return {
    DB: db,
    EMAIL: { send: emailSend as SendEmail['send'] }
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

    await queueHandler(batch as never, createEnv(emailSend) as never)
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

    await queueHandler(batch as never, createEnv(emailSend) as never)
    expect(retry).toHaveBeenCalled()
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

    await queueHandler(batch as never, createEnv() as never)
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

    await queueHandler(batch as never, createEnv() as never)
    expect(ack).toHaveBeenCalled()
    expect(retry).not.toHaveBeenCalled()
    expect(vi.mocked(renderTemplate)).not.toHaveBeenCalled()
  })

  it('acks already sent chunk without sending again', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const emailSend = vi.fn()
    const db = new TestD1Database()
    db.jobs.set('job-1', { status: 'queued' })
    db.chunks.set('job-1:0', { jobId: 'job-1', status: 'sent', updatedAt: new Date().toISOString() })

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

    await queueHandler(batch as never, createEnv(emailSend, db) as never)
    expect(emailSend).not.toHaveBeenCalled()
    expect(ack).toHaveBeenCalled()
    expect(retry).not.toHaveBeenCalled()
  })

  it('acks sent email even when sent status update fails', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const emailSend = vi.fn()
    const db = new TestD1Database()
    db.failSentUpdate = true

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

    await queueHandler(batch as never, createEnv(emailSend, db) as never)
    expect(emailSend).toHaveBeenCalledTimes(1)
    expect(ack).toHaveBeenCalled()
    expect(retry).not.toHaveBeenCalled()
  })
})
