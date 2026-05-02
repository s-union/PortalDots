import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const emailDeliveries = sqliteTable(
  'email_deliveries',
  {
    jobId: text('job_id').notNull(),
    recipient: text('recipient').notNull(),
    template: text('template').notNull(),
    sentAt: integer('sent_at', { mode: 'timestamp' }).notNull()
  },
  (t) => [primaryKey({ columns: [t.jobId, t.recipient] })]
)
