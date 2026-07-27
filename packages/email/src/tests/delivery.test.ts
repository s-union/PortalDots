import { describe, it, expect, vi } from 'vitest'

vi.mock('../templates', () => ({
  renderTemplate: vi.fn()
}))

import { queueHandler } from '../consumer'
import { emailJobChunks } from '../db/schema'
import { app } from '../enqueue'
import { renderTemplate } from '../templates'
import { TestD1Database } from './helpers/d1'

const payload = {
  jobId: 'job-1',
  template: 'markdown-notice',
  from: 'sender@example.com',
  to: Array.from({ length: 120 }, (_, index) => `user${index}@example.com`),
  subject: 'Test Subject',
  body: 'Test Body',
  variables: { appName: 'Test' }
}

describe('enqueue → consumer delivery pipeline', () => {
  it('delivers every recipient exactly once across a partial enqueue and retry', async () => {
    const db = new TestD1Database()
    const env = {
      HIGH_QUEUE: { send: vi.fn() },
      NORMAL_QUEUE: {
        send: vi
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('queue unavailable'))
      },
      DB: db.drizzle,
      AUTH_TOKEN: 'test-token'
    }

    const res = await app.request(
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

    expect(res.status).toBe(500)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(3)
    expect(await res.text()).toContain('Enqueue failed')

    const firstAttemptMessages = env.NORMAL_QUEUE.send.mock.calls.slice(0, 2).map(([body]) => ({
      body,
      ack: vi.fn(),
      retry: vi.fn()
    }))

    vi.mocked(renderTemplate).mockResolvedValue({ html: '<h1>Rendered</h1>', text: 'Rendered' })
    const emailSend = vi.fn().mockResolvedValue({ messageId: 'msg-1' })

    const consume = async (messages: typeof firstAttemptMessages) => {
      const batch = {
        messages,
        queue: 'test-queue',
        metadata: {},
        retryAll: vi.fn(),
        ackAll: vi.fn()
      }
      await queueHandler(batch.messages as never, { DB: db.drizzle, EMAIL: { send: emailSend } } as never)
    }

    await consume(firstAttemptMessages)

    expect(emailSend).toHaveBeenCalledTimes(2)
    expect(await db.jobStatus('job-1')).toBe('enqueue_failed')

    env.NORMAL_QUEUE.send.mockReset()
    env.NORMAL_QUEUE.send.mockResolvedValue(undefined)
    const retryResponse = await app.request(
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
    expect(retryResponse.status).toBe(200)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(1)

    const retryMessage = {
      body: env.NORMAL_QUEUE.send.mock.calls[0][0],
      ack: vi.fn(),
      retry: vi.fn()
    }
    await consume([retryMessage])

    expect(await db.jobStatus('job-1')).toBe('sent')
    const deliveredRecipients = emailSend.mock.calls.flatMap(([message]) => message.to as string[])
    expect(deliveredRecipients).toHaveLength(payload.to.length)
    expect(new Set(deliveredRecipients).size).toBe(payload.to.length)
    expect(deliveredRecipients).toEqual(payload.to)
    for (const message of [...firstAttemptMessages, retryMessage]) {
      expect(message.ack).toHaveBeenCalled()
      expect(message.retry).not.toHaveBeenCalled()
    }

    expect(vi.mocked(renderTemplate)).toHaveBeenCalledWith('markdown-notice', { appName: 'Test' })
    const chunks = await db.drizzle
      .select({ messageId: emailJobChunks.messageId, status: emailJobChunks.status })
      .from(emailJobChunks)
    expect(chunks).toHaveLength(3)
    expect(chunks.every((chunk) => chunk.status === 'sent')).toBe(true)
  })
})
