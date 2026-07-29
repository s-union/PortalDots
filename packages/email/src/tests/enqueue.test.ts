import { describe, it, expect, vi } from 'vitest'
import { app, type EmailJob } from '../enqueue'
import { TestD1Database } from './helpers/d1'

function createTestEnv(authToken = 'test-token') {
  const testDb = new TestD1Database()
  const createQueue = () => ({
    send: vi.fn(),
    sendBatch: undefined as ((messages: readonly EmailJob[]) => Promise<void>) | undefined
  })
  return {
    HIGH_QUEUE: createQueue(),
    NORMAL_QUEUE: createQueue(),
    DB: testDb.drizzle,
    AUTH_TOKEN: authToken,
    testDb
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
  variables: { appName: 'Test', adminName: 'Admin' }
}

function encodedQueueMessageSize(message: EmailJob): number {
  return new TextEncoder().encode(JSON.stringify(message)).byteLength
}

describe('/enqueue', () => {
  it('returns a generic error when AUTH_TOKEN is missing', async () => {
    const env = createTestEnv('')
    const res = await enqueue(env, validPayload)

    expect(res.status).toBe(500)
    expect(await res.text()).not.toContain('AUTH_TOKEN')
  })

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
        messageId: expect.stringMatching(/^job-1:0:[0-9a-f]{64}$/),
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

  it('creates one queue message per recipient', async () => {
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
    expect(body.messageCount).toBe(120)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(120)
    for (const [message] of env.NORMAL_QUEUE.send.mock.calls) {
      expect(message.to).toHaveLength(1)
    }
  })

  it('uses queue batches of at most 100 one-recipient messages', async () => {
    const env = createTestEnv()
    const sendBatch = vi.fn<(messages: readonly EmailJob[]) => Promise<void>>().mockResolvedValue(undefined)
    env.NORMAL_QUEUE.sendBatch = sendBatch
    const recipients = Array.from({ length: 120 }, (_, i) => `user${i}@example.com`)

    const res = await enqueue(env, { ...validPayload, to: recipients })

    expect(res.status).toBe(200)
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
    expect(sendBatch).toHaveBeenCalledTimes(2)
    expect(sendBatch.mock.calls[0][0]).toHaveLength(100)
    expect(sendBatch.mock.calls[1][0]).toHaveLength(20)
    for (const [messages] of sendBatch.mock.calls) {
      for (const message of messages) {
        expect(message.to).toHaveLength(1)
      }
    }
  })

  it('keeps serialized queue batches below the provider byte limit', async () => {
    const env = createTestEnv()
    const sendBatch = vi.fn<(messages: readonly EmailJob[]) => Promise<void>>().mockResolvedValue(undefined)
    env.NORMAL_QUEUE.sendBatch = sendBatch
    const recipients = ['first@example.com', 'second@example.com', 'third@example.com']

    const res = await enqueue(env, { ...validPayload, to: recipients, body: 'x'.repeat(80_000) })

    expect(res.status).toBe(200)
    expect(sendBatch).toHaveBeenCalledTimes(2)
    expect(sendBatch.mock.calls[0][0]).toHaveLength(2)
    expect(sendBatch.mock.calls[1][0]).toHaveLength(1)
  })

  it('accepts an individual queue message at exactly 128 KB and rejects one byte more', async () => {
    const calibrationEnv = createTestEnv()
    expect((await enqueue(calibrationEnv, validPayload)).status).toBe(200)
    const calibrationMessage = calibrationEnv.NORMAL_QUEUE.send.mock.calls[0][0]
    const bodyLength = 128_000 - encodedQueueMessageSize(calibrationMessage) + validPayload.body.length

    const boundaryEnv = createTestEnv()
    const boundaryResponse = await enqueue(boundaryEnv, { ...validPayload, body: 'x'.repeat(bodyLength) })
    expect(boundaryResponse.status).toBe(200)
    expect(encodedQueueMessageSize(boundaryEnv.NORMAL_QUEUE.send.mock.calls[0][0])).toBe(128_000)

    const oversizedEnv = createTestEnv()
    const oversizedResponse = await enqueue(oversizedEnv, {
      ...validPayload,
      body: 'x'.repeat(bodyLength + 1)
    })
    expect(oversizedResponse.status).toBe(413)
    expect(oversizedEnv.NORMAL_QUEUE.send).not.toHaveBeenCalled()
    expect(await oversizedEnv.testDb.jobStatus(validPayload.jobId)).toBeUndefined()
  })

  it('counts body content duplicated in template variables toward the individual message limit', async () => {
    const env = createTestEnv()
    const duplicatedBody = 'x'.repeat(70_000)

    const res = await enqueue(env, {
      ...validPayload,
      body: duplicatedBody,
      variables: { ...validPayload.variables, body: duplicatedBody }
    })

    expect(res.status).toBe(413)
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
    expect(await env.testDb.jobStatus(validPayload.jobId)).toBeUndefined()
  })

  it('rejects a recipient list above the producer limit', async () => {
    const env = createTestEnv()
    const recipients = Array.from({ length: 501 }, (_, i) => `user${i}@example.com`)
    const res = await enqueue(env, { ...validPayload, to: recipients })

    expect(res.status).toBe(400)
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })

  it('marks job as enqueue_failed and records no chunk when queue send fails', async () => {
    const env = createTestEnv()
    env.NORMAL_QUEUE.send.mockRejectedValue(new Error('queue unavailable'))
    const res = await enqueue(env, validPayload)
    expect(res.status).toBe(500)
    expect(await env.testDb.jobStatus('job-1')).toBe('enqueue_failed')
    // A chunk row must never claim acceptance the queue did not grant.
    expect(await env.testDb.chunkMessageIds()).toEqual([])
  })
})

describe('/enqueue retries', () => {
  const recipients = Array.from({ length: 120 }, (_, i) => `user${i}@example.com`)
  const bulkPayload = { ...validPayload, to: recipients }

  it('sends every chunk when the previous attempt only inserted the job row', async () => {
    const env = createTestEnv()
    env.NORMAL_QUEUE.send.mockRejectedValueOnce(new Error('queue unavailable'))
    expect((await enqueue(env, bulkPayload)).status).toBe(500)
    expect(await env.testDb.chunkMessageIds()).toEqual([])
    env.NORMAL_QUEUE.send.mockReset()

    const res = await enqueue(env, bulkPayload)

    expect(res.status).toBe(200)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(120)
    expect(await env.testDb.jobStatus('job-1')).toBe('queued')
  })

  it('sends only the chunks the queue never accepted', async () => {
    const env = createTestEnv()
    env.NORMAL_QUEUE.send
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('queue unavailable'))

    const failed = await enqueue(env, bulkPayload)
    expect(failed.status).toBe(500)
    expect(await env.testDb.jobStatus('job-1')).toBe('enqueue_failed')
    // The fallback queue adapter failed before its batch was confirmed, so none
    // of the attempted messages may be recorded as accepted.
    expect(await env.testDb.chunkMessageIds()).toEqual([])

    env.NORMAL_QUEUE.send.mockReset()
    const retried = await enqueue(env, bulkPayload)

    expect(retried.status).toBe(200)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(120)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: expect.stringMatching(/^job-1:2:[0-9a-f]{64}$/),
        chunkIndex: 2,
        to: [recipients[2]]
      })
    )
    expect(await env.testDb.jobStatus('job-1')).toBe('queued')
  })

  it('retries only the unaccepted queue batch', async () => {
    const env = createTestEnv()
    const sendBatch = vi
      .fn<(messages: readonly EmailJob[]) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('queue unavailable'))
    env.NORMAL_QUEUE.sendBatch = sendBatch

    const failed = await enqueue(env, bulkPayload)

    expect(failed.status).toBe(500)
    expect(await env.testDb.chunkMessageIds()).toHaveLength(100)

    sendBatch.mockReset()
    sendBatch.mockResolvedValue(undefined)
    const retried = await enqueue(env, bulkPayload)

    expect(retried.status).toBe(200)
    expect(sendBatch).toHaveBeenCalledTimes(1)
    expect(sendBatch.mock.calls[0][0]).toHaveLength(20)
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })

  it('is a no-op for a job whose chunks are all queued', async () => {
    const env = createTestEnv()
    expect((await enqueue(env, bulkPayload)).status).toBe(200)
    env.NORMAL_QUEUE.send.mockClear()

    const res = await enqueue(env, bulkPayload)

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; status: string; messageCount: number }
    expect(body).toMatchObject({ success: true, status: 'queued', messageCount: 120 })
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })

  it('rejects a changed recipient chunk for an existing job', async () => {
    const env = createTestEnv()
    expect((await enqueue(env, bulkPayload)).status).toBe(200)
    env.NORMAL_QUEUE.send.mockClear()

    const changedRecipients = [...recipients]
    changedRecipients[0] = 'replacement@example.com'
    const res = await enqueue(env, { ...bulkPayload, to: changedRecipients })

    expect(res.status).toBe(409)
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
    expect(await env.testDb.jobStatus('job-1')).toBe('queued')
  })

  it.each([
    ['template', { template: 'staff-auth-notice' }],
    ['priority', { priority: 'high' }],
    ['sender', { from: 'replacement@example.com' }],
    ['subject', { subject: 'Changed subject' }],
    ['body', { body: 'Changed body' }],
    ['variables', { variables: { ...bulkPayload.variables, adminName: 'Replacement' } }]
  ])('rejects changed %s for an existing job', async (_field, change) => {
    const env = createTestEnv()
    expect((await enqueue(env, bulkPayload)).status).toBe(200)
    env.NORMAL_QUEUE.send.mockClear()
    env.HIGH_QUEUE.send.mockClear()

    const res = await enqueue(env, { ...bulkPayload, ...change })

    expect(res.status).toBe(409)
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
    expect(env.HIGH_QUEUE.send).not.toHaveBeenCalled()
  })

  it('treats reordered variable keys as the same canonical payload', async () => {
    const env = createTestEnv()
    expect((await enqueue(env, bulkPayload)).status).toBe(200)
    env.NORMAL_QUEUE.send.mockClear()

    const res = await enqueue(env, {
      ...bulkPayload,
      variables: { adminName: bulkPayload.variables.adminName, appName: bulkPayload.variables.appName }
    })

    expect(res.status).toBe(200)
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })

  it('rejects a changed payload before resuming a partial retry', async () => {
    const env = createTestEnv()
    env.NORMAL_QUEUE.send
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('queue unavailable'))
    expect((await enqueue(env, bulkPayload)).status).toBe(500)

    env.NORMAL_QUEUE.send.mockClear()
    const res = await enqueue(env, { ...bulkPayload, body: 'Changed body' })

    expect(res.status).toBe(409)
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })

  it('rejects an unbound legacy job identity', async () => {
    const env = createTestEnv()
    await env.testDb.seedJob({
      jobId: 'job-1',
      status: 'enqueue_failed',
      chunkCount: 120,
      recipientsCount: 120
    })
    const res = await enqueue(env, bulkPayload)

    expect(res.status).toBe(409)
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })
})
