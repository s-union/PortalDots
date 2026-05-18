import { describe, it, expect, vi, beforeEach } from 'vitest'

interface MessageLike {
  body: unknown
  ack: () => void
  retry: () => void
}

vi.mock('../templates', () => ({
  renderTemplate: vi.fn()
}))

import handler from '../index'
import { renderTemplate } from '../templates'

function createMessageBatch(messages: MessageLike[]) {
  return {
    messages,
    queue: 'test-queue',
    metadata: {},
    retryAll: vi.fn(),
    ackAll: vi.fn()
  }
}

function createEnv(emailSend = vi.fn().mockResolvedValue({ messageId: 'msg-1' })) {
  return {
    EMAIL: { send: emailSend as SendEmail['send'] }
  }
}

describe('email-consumer queue handler', () => {
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

    await handler.queue(batch as never, createEnv(emailSend) as never)
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

    await handler.queue(batch as never, createEnv(emailSend) as never)
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

    await handler.queue(batch as never, createEnv() as never)
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

    await handler.queue(batch as never, createEnv() as never)
    expect(ack).toHaveBeenCalled()
    expect(retry).not.toHaveBeenCalled()
    expect(vi.mocked(renderTemplate)).not.toHaveBeenCalled()
  })
})
