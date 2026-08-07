import { vi } from 'vitest'
import type { ConsumerEnv } from '../../consumer'
import type { QueueMessage } from '../../ports'
import { TestD1Database } from './d1'

/**
 * A queue message carrying only the members `queueHandler` reads. Return type
 * is inferred (not annotated as `QueueMessage`) so callers keep `Mock` typing
 * on `ack`/`retry` for `toHaveBeenCalled()` assertions.
 */
export function createQueueMessage(body: unknown, ack = vi.fn(), retry = vi.fn()) {
  return { body, ack, retry }
}

/**
 * Mimics the `MessageBatch` shape the Worker's queue export receives; only
 * `.messages` reaches `queueHandler` under test.
 */
export function createMessageBatch(messages: QueueMessage[]) {
  return {
    messages,
    queue: 'test-queue',
    metadata: {},
    retryAll: vi.fn(),
    ackAll: vi.fn()
  }
}

export function createConsumerEnv(
  emailSend = vi.fn().mockResolvedValue(undefined),
  db = new TestD1Database()
): ConsumerEnv {
  return {
    DB: db.drizzle,
    EMAIL: { send: emailSend }
  }
}
