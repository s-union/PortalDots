import { eq } from 'drizzle-orm'
import { emailDeliveries } from './db/schema'
import { createDb } from './db/client'
import { renderTemplate } from './templates'

interface EmailJob {
  jobId: string
  template: string
  priority: 'high' | 'normal'
  from: string
  to: string[]
  subject: string
  body: string
  variables: Record<string, string>
}

export interface Env {
  DB: D1Database
  EMAIL: SendEmail
}

export default {
  async queue(batch, env: Env): Promise<void> {
    const db = createDb(env.DB)

    for (const message of batch.messages) {
      try {
        const job = message.body as EmailJob

        if (job.to.length === 0) {
          message.ack()
          continue
        }

        // Batch idempotency check: query all existing deliveries for this job
        const existingRows = await db
          .select({ recipient: emailDeliveries.recipient })
          .from(emailDeliveries)
          .where(eq(emailDeliveries.jobId, job.jobId))

        const deliveredSet = new Set(existingRows.map((r) => r.recipient))
        const pendingRecipients = job.to.filter((r) => !deliveredSet.has(r))

        if (pendingRecipients.length === 0) {
          console.log(`All recipients already delivered for job: ${job.jobId}`)
          message.ack()
          continue
        }

        // Render template once per message
        const { html, text } = await renderTemplate(job.template, job.variables)

        // Send all pending recipients in one call (Producer guarantees max 50)
        await env.EMAIL.send({
          to: pendingRecipients,
          from: job.from,
          subject: job.subject,
          html,
          text
        })

        // Record deliveries
        const now = new Date()
        await db.insert(emailDeliveries).values(
          pendingRecipients.map((recipient) => ({
            jobId: job.jobId,
            recipient,
            template: job.template,
            subject: job.subject,
            body: job.body,
            sentAt: now
          }))
        )

        message.ack()
      } catch (error) {
        console.error('Failed to process email job:', error)
        message.retry()
      }
    }
  }
} satisfies ExportedHandler<Env>
