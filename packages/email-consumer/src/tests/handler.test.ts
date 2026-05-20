import { describe, it, expect, vi, beforeEach } from 'vitest'

interface MessageLike {
  body: unknown
  ack: () => void
  retry: () => void
}

interface D1RunResult {
  meta: { changes: number }
  results: unknown[]
  success: true
}

class TestD1Statement {
  private values: unknown[] = []

  constructor(
    private readonly query: string,
    private readonly db: TestD1Database
  ) {}

  bind(...values: unknown[]): TestD1Statement {
    this.values = values
    return this
  }

  async run(): Promise<D1RunResult> {
    return this.db.run(this.query, this.values)
  }

  async first<T>(): Promise<T | null> {
    return this.db.first<T>(this.query, this.values)
  }
}

class TestD1Database {
  readonly jobs = new Map<string, { status: string }>()
  readonly chunks = new Map<string, { jobId: string; status: string; updatedAt: string }>()
  failSentUpdate = false

  prepare(query: string): TestD1Statement {
    return new TestD1Statement(query, this)
  }

  async batch(statements: TestD1Statement[]): Promise<D1RunResult[]> {
    return Promise.all(statements.map((statement) => statement.run()))
  }

  async run(query: string, values: unknown[]): Promise<D1RunResult> {
    if (query.includes('INSERT OR IGNORE INTO email_jobs')) {
      const jobId = String(values[0])
      if (!this.jobs.has(jobId)) {
        this.jobs.set(jobId, { status: 'queued' })
        return runResult(1)
      }
      return runResult(0)
    }
    if (query.includes('INSERT OR IGNORE INTO email_job_chunks')) {
      const messageId = String(values[0])
      if (!this.chunks.has(messageId)) {
        this.chunks.set(messageId, { jobId: String(values[1]), status: 'queued', updatedAt: String(values[6]) })
        return runResult(1)
      }
      return runResult(0)
    }
    if (query.includes("SET status = 'processing'")) {
      const messageId = String(values[1])
      const chunk = this.chunks.get(messageId)
      if (!chunk) return runResult(0)
      if (
        chunk.status === 'queued' ||
        chunk.status === 'enqueue_failed' ||
        (chunk.status === 'processing' && chunk.updatedAt === values[2])
      ) {
        chunk.status = 'processing'
        chunk.updatedAt = String(values[0])
        return runResult(1)
      }
      return runResult(0)
    }
    if (query.includes("UPDATE email_job_chunks SET status = 'sent'")) {
      if (this.failSentUpdate) {
        throw new Error('D1 unavailable')
      }
      const chunk = this.chunks.get(String(values[1]))
      if (chunk) {
        chunk.status = 'sent'
        chunk.updatedAt = String(values[0])
      }
      return runResult(chunk ? 1 : 0)
    }
    if (query.includes('UPDATE email_jobs') && query.includes("SET status = 'sent'")) {
      const jobId = String(values[1])
      const hasUnsentChunks = Array.from(this.chunks.values()).some(
        (chunk) => chunk.jobId === jobId && chunk.status !== 'sent'
      )
      const job = this.jobs.get(jobId)
      if (job && !hasUnsentChunks) {
        job.status = 'sent'
        return runResult(1)
      }
      return runResult(0)
    }
    if (query.includes("SET status = 'enqueue_failed'") && query.includes('email_job_chunks')) {
      const chunk = this.chunks.get(String(values[2]))
      if (chunk) chunk.status = 'enqueue_failed'
      return runResult(chunk ? 1 : 0)
    }
    if (query.includes("SET status = 'enqueue_failed'") && query.includes('email_jobs')) {
      const job = this.jobs.get(String(values[2]))
      if (job) job.status = 'enqueue_failed'
      return runResult(job ? 1 : 0)
    }
    return runResult(0)
  }

  async first<T>(query: string, values: unknown[]): Promise<T | null> {
    if (query.includes('FROM email_jobs') && query.includes('JOIN email_job_chunks')) {
      const job = this.jobs.get(String(values[0]))
      const chunk = this.chunks.get(String(values[1]))
      if (!job || !chunk) return null
      return {
        job_status: job.status,
        chunk_status: chunk.status,
        chunk_updated_at: chunk.updatedAt
      } as T
    }
    return null
  }
}

function runResult(changes: number): D1RunResult {
  return {
    success: true,
    results: [],
    meta: { changes }
  }
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

function createEnv(emailSend = vi.fn().mockResolvedValue({ messageId: 'msg-1' }), db = new TestD1Database()) {
  return {
    DB: db,
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

    await handler.queue(batch as never, createEnv(emailSend, db) as never)
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

    await handler.queue(batch as never, createEnv(emailSend, db) as never)
    expect(emailSend).toHaveBeenCalledTimes(1)
    expect(ack).toHaveBeenCalled()
    expect(retry).not.toHaveBeenCalled()
  })
})
