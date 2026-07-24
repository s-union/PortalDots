import { describe, it, expect, vi } from 'vitest'
import { app, fireDueScheduledEmails } from '../enqueue'
import { TestD1Database } from './helpers/d1'

function createTestEnv(authToken = 'test-token') {
  return {
    HIGH_QUEUE: { send: vi.fn() },
    NORMAL_QUEUE: { send: vi.fn() },
    DB: new TestD1Database(),
    AUTH_TOKEN: authToken
  }
}

const emailPayload = {
  jobId: 'job-page-1',
  template: 'markdown-notice',
  from: 'sender@example.com',
  to: ['recipient@example.com'],
  subject: 'Test Subject',
  body: 'Test Body',
  variables: { appName: 'Test' }
}

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer test-token'
}

function futureIso(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

function pastIso(): string {
  return new Date(Date.now() - 60 * 1000).toISOString()
}

async function postSync(env: ReturnType<typeof createTestEnv>, body: unknown) {
  return app.request(
    '/scheduled/sync',
    { method: 'POST', headers: authHeaders, body: JSON.stringify(body) },
    env as never
  )
}

describe('/scheduled/sync', () => {
  it('returns 401 without authorization', async () => {
    const env = createTestEnv()
    const res = await app.request(
      '/scheduled/sync',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) },
      env as never
    )
    expect(res.status).toBe(401)
  })

  it('schedules an email when sendAt is in the future', async () => {
    const env = createTestEnv()
    const res = await postSync(env, {
      groupId: 'page-1',
      isPublic: true,
      sendEmails: true,
      sendAt: futureIso(),
      payload: emailPayload
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('scheduled')
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
    expect(env.DB.scheduled.get('page-1')?.status).toBe('scheduled')
  })

  it('dispatches immediately when sendAt is in the past', async () => {
    const env = createTestEnv()
    const res = await postSync(env, {
      groupId: 'page-1',
      isPublic: true,
      sendEmails: true,
      sendAt: pastIso(),
      payload: emailPayload
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('dispatched')
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(1)
  })

  it('cancels a pending email when the page is not public', async () => {
    const env = createTestEnv()
    env.DB.scheduled.set('page-1', {
      status: 'scheduled',
      sendAt: futureIso(),
      payload: JSON.stringify(emailPayload),
      updatedAt: pastIso()
    })
    const res = await postSync(env, { groupId: 'page-1', isPublic: false, sendEmails: false, payload: null })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('cancelled')
    expect(env.DB.scheduled.get('page-1')?.status).toBe('cancelled')
  })

  it('updates the pending email when the page is edited while public', async () => {
    const env = createTestEnv()
    env.DB.scheduled.set('page-1', {
      status: 'scheduled',
      sendAt: futureIso(),
      payload: JSON.stringify(emailPayload),
      updatedAt: pastIso()
    })
    const newSendAt = futureIso()
    const res = await postSync(env, {
      groupId: 'page-1',
      isPublic: true,
      sendEmails: false,
      sendAt: newSendAt,
      payload: { ...emailPayload, subject: 'Updated Subject' }
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('updated')
    const record = env.DB.scheduled.get('page-1')
    expect(record?.status).toBe('scheduled')
    expect(record?.sendAt).toBe(newSendAt)
    expect(JSON.parse(record?.payload ?? '{}').subject).toBe('Updated Subject')
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })

  it('returns unchanged when public without a pending email and no send request', async () => {
    const env = createTestEnv()
    const res = await postSync(env, { groupId: 'page-1', isPublic: true, sendEmails: false, payload: null })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('unchanged')
  })

  it('rejects a non-ISO sendAt with 400', async () => {
    const env = createTestEnv()
    const res = await postSync(env, {
      groupId: 'page-1',
      isPublic: true,
      sendEmails: true,
      sendAt: 'tomorrow at noon',
      payload: emailPayload
    })
    expect(res.status).toBe(400)
  })

  it('normalizes a sendAt with a UTC offset to UTC before storing', async () => {
    const env = createTestEnv()
    const base = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const offsetIso = new Date(base.getTime() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
    const res = await postSync(env, {
      groupId: 'page-1',
      isPublic: true,
      sendEmails: true,
      sendAt: offsetIso,
      payload: emailPayload
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('scheduled')
    expect(env.DB.scheduled.get('page-1')?.sendAt).toBe(base.toISOString())
  })
})

describe('fireDueScheduledEmails', () => {
  it('dispatches due scheduled emails and marks them fired', async () => {
    const env = createTestEnv()
    env.DB.scheduled.set('page-due', {
      status: 'scheduled',
      sendAt: pastIso(),
      payload: JSON.stringify(emailPayload),
      updatedAt: pastIso()
    })
    env.DB.scheduled.set('page-future', {
      status: 'scheduled',
      sendAt: futureIso(),
      payload: JSON.stringify({ ...emailPayload, jobId: 'job-page-future' }),
      updatedAt: pastIso()
    })

    const fired = await fireDueScheduledEmails(env as never)

    expect(fired).toBe(1)
    expect(env.NORMAL_QUEUE.send).toHaveBeenCalledTimes(1)
    expect(env.DB.scheduled.get('page-due')?.status).toBe('fired')
    expect(env.DB.scheduled.get('page-future')?.status).toBe('scheduled')
  })

  it('marks the row fired when the job was already delivered (duplicate)', async () => {
    const env = createTestEnv()
    env.DB.jobs.set('job-page-1', { status: 'sent' })
    env.DB.scheduled.set('page-dup', {
      status: 'scheduled',
      sendAt: pastIso(),
      payload: JSON.stringify(emailPayload),
      updatedAt: pastIso()
    })

    const fired = await fireDueScheduledEmails(env as never)

    expect(fired).toBe(1)
    expect(env.DB.scheduled.get('page-dup')?.status).toBe('fired')
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })

  it('leaves the row scheduled when dispatch fails so the next run retries', async () => {
    const env = createTestEnv()
    env.NORMAL_QUEUE.send.mockRejectedValueOnce(new Error('queue unavailable'))
    env.DB.scheduled.set('page-fail', {
      status: 'scheduled',
      sendAt: pastIso(),
      payload: JSON.stringify(emailPayload),
      updatedAt: pastIso()
    })

    // First run: queue.send rejects, leaving the job 'enqueue_failed'; the row must stay scheduled.
    const firstFired = await fireDueScheduledEmails(env as never)

    expect(firstFired).toBe(0)
    expect(env.DB.jobs.get('job-page-1')?.status).toBe('enqueue_failed')
    expect(env.DB.scheduled.get('page-fail')?.status).toBe('scheduled')

    // Second run: dispatchJob reports a duplicate with 'enqueue_failed' status, which is not
    // a delivered state; the row must still not be marked fired.
    const secondFired = await fireDueScheduledEmails(env as never)

    expect(secondFired).toBe(0)
    expect(env.DB.scheduled.get('page-fail')?.status).toBe('scheduled')
  })

  it('cancels scheduled emails with invalid payloads instead of retrying forever', async () => {
    const env = createTestEnv()
    env.DB.scheduled.set('page-bad-json', {
      status: 'scheduled',
      sendAt: pastIso(),
      payload: '{not-json',
      updatedAt: pastIso()
    })
    env.DB.scheduled.set('page-bad-schema', {
      status: 'scheduled',
      sendAt: pastIso(),
      payload: JSON.stringify({ jobId: '' }),
      updatedAt: pastIso()
    })

    const fired = await fireDueScheduledEmails(env as never)

    expect(fired).toBe(0)
    expect(env.DB.scheduled.get('page-bad-json')?.status).toBe('cancelled')
    expect(env.DB.scheduled.get('page-bad-schema')?.status).toBe('cancelled')
    expect(env.NORMAL_QUEUE.send).not.toHaveBeenCalled()
  })
})
