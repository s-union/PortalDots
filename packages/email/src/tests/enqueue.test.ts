import { describe, it, expect, vi } from 'vitest'
import { app } from '../enqueue'
import { TestD1Database } from './helpers/d1'

function createTestEnv(authToken = 'test-token') {
  return {
    HIGH_QUEUE: { send: vi.fn() },
    NORMAL_QUEUE: { send: vi.fn() },
    DB: new TestD1Database(),
    AUTH_TOKEN: authToken
  }
}

async function enqueue(env: ReturnType<typeof createTestEnv>, payload: unknown): Promise<Response> {
  return app.request(
    '/enqueue',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify(payload)
    },
    env as never
  )
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

  it('marks job as enqueue_failed and records no chunk when queue send fails', async () => {
    const env = createTestEnv()
    env.NORMAL_QUEUE.send.mockRejectedValue(new Error('queue unavailable'))
    const res = await enqueue(env, validPayload)
    expect(res.status).toBe(500)
    expect(env.DB.jobs.get('job-1')?.status).toBe('enqueue_failed')
    // A chunk row must never claim acceptance the queue did not grant.
    expect(env.DB.chunks.has('job-1:0')).toBe(false)
  })
})

describe('/enqueue retries', () => {
  const recipients = Array.from({ length: 120 }, (_, i) => `user${i}@example.com`)
  const bulkPayload = { ...validPayload, to: recipients }

  it('sends every chunk when the previous attempt only inserted the job row', async () => {
    const env = createTestEnv()
    // Previous attempt inserted the job row, then died before sending anything.
    env.DB.jobs.set('job-1', { status: 'pending', chunkCount: 3 })

    const res = await enqueue(env, bulkPayload)

    expect(res.status).toBe(200)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(3)
    expect(env.DB.jobs.get('job-1')?.status).toBe('queued')
  })

  it('sends only the chunks the queue never accepted', async () => {
    const env = createTestEnv()
    env.NORMAL_QUEUE.send
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('queue unavailable'))

    const failed = await enqueue(env, bulkPayload)
    expect(failed.status).toBe(500)
    expect(env.DB.jobs.get('job-1')?.status).toBe('enqueue_failed')
    expect(Array.from(env.DB.chunks.keys())).toEqual(['job-1:0', 'job-1:1'])

    env.NORMAL_QUEUE.send.mockReset()
    const retried = await enqueue(env, bulkPayload)

    expect(retried.status).toBe(200)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(1)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'job-1:2', chunkIndex: 2, to: recipients.slice(100) })
    )
    expect(env.DB.jobs.get('job-1')?.status).toBe('queued')
  })

  it('is a no-op for a job whose chunks are all queued', async () => {
    const env = createTestEnv()
    expect((await enqueue(env, bulkPayload)).status).toBe(200)
    env.NORMAL_QUEUE.send.mockClear()

    const res = await enqueue(env, bulkPayload)

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; status: string; messageCount: number }
    expect(body).toMatchObject({ success: true, status: 'queued', messageCount: 3 })
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })
})
