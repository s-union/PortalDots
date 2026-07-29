import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

/** 'pending': the job is recorded but the queue has not accepted every chunk yet. */
const jobStatuses = ['pending', 'queued', 'enqueue_failed', 'processing', 'sent'] as const
/** A chunk row only exists once the queue accepted it, so it is never 'pending'. */
const chunkStatuses = ['queued', 'enqueue_failed', 'processing', 'sent'] as const
const priorities = ['high', 'normal'] as const

/** Render a CHECK constraint from the same literals the column's TypeScript union is built from. */
function statusCheck(name: string, column: string, values: readonly string[]) {
  return check(name, sql.raw(`${column} IN (${values.map((value) => `'${value}'`).join(', ')})`))
}

export const emailJobs = sqliteTable(
  'email_jobs',
  {
    jobId: text('job_id').primaryKey(),
    status: text('status', { enum: jobStatuses }).notNull(),
    template: text('template').notNull(),
    priority: text('priority', { enum: priorities }).notNull(),
    payloadDigest: text('payload_digest').notNull().default(''),
    subject: text('subject').notNull(),
    recipientsCount: integer('recipients_count').notNull(),
    chunkCount: integer('chunk_count').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    lastError: text('last_error')
  },
  () => [
    statusCheck('email_jobs_status_check', 'status', jobStatuses),
    statusCheck('email_jobs_priority_check', 'priority', priorities)
  ]
)

export const emailJobChunks = sqliteTable(
  'email_job_chunks',
  {
    messageId: text('message_id').primaryKey(),
    jobId: text('job_id')
      .notNull()
      .references(() => emailJobs.jobId, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    chunkCount: integer('chunk_count').notNull(),
    status: text('status', { enum: chunkStatuses }).notNull(),
    recipientsCount: integer('recipients_count').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    lastError: text('last_error')
  },
  (table) => [
    unique().on(table.jobId, table.chunkIndex),
    index('email_job_chunks_job_id_status_index').on(table.jobId, table.status),
    statusCheck('email_job_chunks_status_check', 'status', chunkStatuses)
  ]
)

/** Status of a whole job, derived from the column so it cannot drift from the CHECK constraint. */
export type JobStatus = (typeof emailJobs.$inferSelect)['status']
/** Status of a single queued chunk, derived from the column. */
export type ChunkStatus = (typeof emailJobChunks.$inferSelect)['status']
