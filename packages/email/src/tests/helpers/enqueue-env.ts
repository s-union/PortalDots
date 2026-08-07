import { vi, type Mock } from 'vitest'
import type { EmailJob, Env } from '../../enqueue'
import { TestD1Database } from './d1'

function createQueue() {
  return {
    send: vi.fn<(message: EmailJob) => Promise<void>>(),
    sendBatch: undefined as Mock<(messages: readonly EmailJob[]) => Promise<void>> | undefined
  }
}

export function createEnqueueEnv(authToken = 'test-token') {
  const testDb = new TestD1Database()
  return {
    HIGH_QUEUE: createQueue(),
    NORMAL_QUEUE: createQueue(),
    DB: testDb.drizzle,
    AUTH_TOKEN: authToken,
    testDb
  } satisfies Env & { testDb: TestD1Database }
}
