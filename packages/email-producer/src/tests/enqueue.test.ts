import { describe, it, expect, vi } from 'vitest'
import app from '../index'

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
  readonly jobs = new Map<string, { status: string; chunkCount: number }>()
  readonly chunks = new Map<string, { jobId: string; status: string }>()

  prepare(query: string): TestD1Statement {
    return new TestD1Statement(query, this)
  }

  async batch(statements: TestD1Statement[]): Promise<D1RunResult[]> {
    return Promise.all(statements.map((statement) => statement.run()))
  }

  async run(query: string, values: unknown[]): Promise<D1RunResult> {
    if (query.includes('INSERT INTO email_jobs')) {
      const jobId = String(values[0])
      if (this.jobs.has(jobId)) {
        throw new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: email_jobs.job_id')
      }
      this.jobs.set(jobId, { status: 'queued', chunkCount: Number(values[5]) })
      return runResult(1)
    }
    if (query.includes('INSERT INTO email_job_chunks')) {
      const messageId = String(values[0])
      this.chunks.set(messageId, { jobId: String(values[1]), status: 'queued' })
      return runResult(1)
    }
    if (query.includes("UPDATE email_jobs SET status = 'queued'")) {
      const job = this.jobs.get(String(values[1]))
      if (job) job.status = 'queued'
      return runResult(job ? 1 : 0)
    }
    if (query.includes("UPDATE email_jobs SET status = 'enqueue_failed'")) {
      const job = this.jobs.get(String(values[2]))
      if (job) job.status = 'enqueue_failed'
      return runResult(job ? 1 : 0)
    }
    if (query.includes("UPDATE email_job_chunks SET status = 'enqueue_failed'")) {
      const chunk = this.chunks.get(String(values[2]))
      if (chunk) chunk.status = 'enqueue_failed'
      return runResult(chunk ? 1 : 0)
    }
    return runResult(0)
  }

  async first<T>(query: string, values: unknown[]): Promise<T | null> {
    if (query.includes('SELECT status FROM email_jobs')) {
      const job = this.jobs.get(String(values[0]))
      return (job ? { status: job.status } : null) as T | null
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

function createTestEnv(authToken = 'test-token') {
  return {
    HIGH_QUEUE: { send: vi.fn() },
    NORMAL_QUEUE: { send: vi.fn() },
    DB: new TestD1Database(),
    AUTH_TOKEN: authToken
  }
}

const validPayload = {
  jobId: 'job-1',
  template: 'markdown-notice',
  from: 'sender@example.com',
  to: ['recipient@example.com'],
  subject: 'Test Subject',
  body: 'Test Body',
  variables: { appName: 'Test' }
}

describe('/enqueue', () => {
  it('returns 401 without authorization', async () => {
    const env = createTestEnv()
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload)
      },
      env as never
    )
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong token', async () => {
    const env = createTestEnv()
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wrong-token'
        },
        body: JSON.stringify(validPayload)
      },
      env as never
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid payload', async () => {
    const env = createTestEnv()
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({})
      },
      env as never
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid from email', async () => {
    const env = createTestEnv()
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({ ...validPayload, from: 'not-an-email' })
      },
      env as never
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty to array', async () => {
    const env = createTestEnv()
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({ ...validPayload, to: [] })
      },
      env as never
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for unknown template', async () => {
    const env = createTestEnv()
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({ ...validPayload, template: 'unknown-template' })
      },
      env as never
    )
    expect(res.status).toBe(400)
  })

  it('enqueues to HIGH_QUEUE for priority=high', async () => {
    const env = createTestEnv()
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({ ...validPayload, priority: 'high' })
      },
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('queued')
    expect(env.HIGH_QUEUE.send).toHaveBeenCalledTimes(1)
    expect(env.HIGH_QUEUE.send).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        messageId: 'job-1:0',
        chunkIndex: 0,
        chunkCount: 1
      })
    )
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })

  it('enqueues to NORMAL_QUEUE for default priority', async () => {
    const env = createTestEnv()
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify(validPayload)
      },
      env as never
    )
    expect(res.status).toBe(200)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(1)
    expect(env.HIGH_QUEUE.send).not.toHaveBeenCalled()
  })

  it('splits recipients into chunks of 50', async () => {
    const env = createTestEnv()
    const recipients = Array.from({ length: 120 }, (_, i) => `user${i}@example.com`)
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({ ...validPayload, to: recipients })
      },
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { messageCount: number }
    expect(body.messageCount).toBe(3)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(3)
  })

  it('skips enqueue for duplicate jobId', async () => {
    const env = createTestEnv()
    env.DB.jobs.set('job-1', { status: 'queued', chunkCount: 1 })
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify(validPayload)
      },
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; existingStatus: string }
    expect(body.status).toBe('duplicate')
    expect(body.existingStatus).toBe('queued')
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })

  it('marks job as enqueue_failed when queue send fails', async () => {
    const env = createTestEnv()
    env.NORMAL_QUEUE.send.mockRejectedValue(new Error('queue unavailable'))
    const res = await app.request(
      '/enqueue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify(validPayload)
      },
      env as never
    )
    expect(res.status).toBe(500)
    expect(env.DB.jobs.get('job-1')?.status).toBe('enqueue_failed')
    expect(env.DB.chunks.get('job-1:0')?.status).toBe('enqueue_failed')
  })
})
