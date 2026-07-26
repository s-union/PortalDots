import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'

/** Drizzle handle over the D1 binding, shared by the producer and the queue consumer. */
export type EmailDb = DrizzleD1Database

/**
 * Wrap a D1 binding in Drizzle. Call once per request or queue batch and pass the
 * result around instead of re-wrapping the binding for every query.
 */
export function createDb(binding: D1Database): EmailDb {
  return drizzle(binding)
}
