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

const knownTemplates = new Set(['markdown-notice', 'registration-verify', 'staff-auth-notice'])

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && Object.values(value).every((item) => typeof item === 'string')
}

function parseEmailJob(value: unknown): EmailJob | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.jobId !== 'string' ||
    typeof candidate.template !== 'string' ||
    !knownTemplates.has(candidate.template) ||
    (candidate.priority !== 'high' && candidate.priority !== 'normal') ||
    typeof candidate.from !== 'string' ||
    !Array.isArray(candidate.to) ||
    !candidate.to.every((recipient) => typeof recipient === 'string') ||
    typeof candidate.subject !== 'string' ||
    typeof candidate.body !== 'string' ||
    !isStringRecord(candidate.variables)
  ) {
    return null
  }

  return {
    jobId: candidate.jobId,
    template: candidate.template,
    priority: candidate.priority,
    from: candidate.from,
    to: candidate.to,
    subject: candidate.subject,
    body: candidate.body,
    variables: candidate.variables
  }
}

export interface Env {
  EMAIL: SendEmail
}

export default {
  async queue(batch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const job = parseEmailJob(message.body)
        if (!job) {
          console.error('Invalid email job payload')
          message.ack()
          continue
        }

        if (job.to.length === 0) {
          message.ack()
          continue
        }

        // Render template once per message
        const { html, text } = await renderTemplate(job.template, job.variables)

        // Send all pending recipients in one call (Producer guarantees max 50)
        await env.EMAIL.send({
          to: job.to,
          from: job.from,
          subject: job.subject,
          html,
          text
        })

        console.info('Email job sent', {
          jobId: job.jobId,
          template: job.template,
          priority: job.priority,
          recipientsCount: job.to.length
        })

        message.ack()
      } catch (error) {
        console.error('Failed to process email job:', error)
        message.retry()
      }
    }
  }
} satisfies ExportedHandler<Env>
