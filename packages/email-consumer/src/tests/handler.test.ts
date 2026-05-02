import { describe, it, expect, vi, beforeEach } from 'vitest'

interface MessageLike {
  body: unknown
  ack: () => void
  retry: () => void
}

const mockSelect = vi.fn()
const mockInsert = vi.fn()

vi.mock('../db/client', () => ({
  createDb: () => ({
    select: mockSelect,
    insert: mockInsert
  })
}))

vi.mock('../db/schema', () => ({
  emailDeliveries: { name: 'email_deliveries' }
}))

vi.mock('../templates', () => ({
  renderTemplate: vi.fn()
}))

vi.mock('drizzle-orm/sqlite-core', () => ({}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn()
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
    DB: {} as D1Database,
    EMAIL: { send: emailSend as SendEmail['send'] }
  }
}

describe('email-consumer queue handler', () => {
  let whereMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(renderTemplate).mockResolvedValue({ html: '<h1>Test</h1>', text: 'Test' })
    whereMock = vi.fn().mockResolvedValue([])
    mockSelect.mockReturnValue({ from: vi.fn().mockReturnValue({ where: whereMock }) })
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
  })

  it('acks message when all recipients are already delivered', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    whereMock.mockResolvedValue([{ recipient: 'a@example.com' }, { recipient: 'b@example.com' }])

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          template: 'markdown-notice',
          to: ['a@example.com', 'b@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await handler.queue(batch as never, createEnv() as never)
    expect(ack).toHaveBeenCalled()
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
          to: ['a@example.com', 'b@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
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
    expect(mockInsert).toHaveBeenCalled()
    expect(ack).toHaveBeenCalled()
  })

  it('skips already delivered and sends only pending', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const emailSend = vi.fn()
    whereMock.mockResolvedValue([{ recipient: 'a@example.com' }])

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          template: 'markdown-notice',
          to: ['a@example.com', 'b@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          variables: {}
        },
        ack,
        retry
      }
    ])

    await handler.queue(batch as never, createEnv(emailSend) as never)
    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: ['b@example.com'] }))
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
          to: ['a@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
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
          to: [],
          from: 'sender@example.com',
          subject: 'Test',
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

  it('does not render when all already delivered', async () => {
    whereMock.mockResolvedValue([{ recipient: 'a@example.com' }])

    const batch = createMessageBatch([
      {
        body: {
          jobId: 'job-1',
          template: 'markdown-notice',
          to: ['a@example.com'],
          from: 'sender@example.com',
          subject: 'Test',
          variables: {}
        },
        ack: vi.fn(),
        retry: vi.fn()
      }
    ])

    await handler.queue(batch as never, createEnv() as never)
    expect(vi.mocked(renderTemplate)).not.toHaveBeenCalled()
  })
})
