import { type EmailDb } from './db/client'
import {
  ensureMessageRecord,
  getMessageStatus,
  markMessageFailed,
  markMessageSent,
  tryClaimChunk
} from './db/repository'
import type { MailTransport, QueueMessage } from './ports'
import { renderTemplate } from './templates'
import type { EmailJob } from './enqueue'

const PROCESSING_STALE_AFTER_MS = 15 * 60 * 1000

export interface ConsumerEnv {
  DB: EmailDb
  EMAIL: MailTransport
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && Object.values(value).every((item) => typeof item === 'string')
}

const knownTemplates = new Set(['markdown-notice', 'registration-verify', 'staff-auth-notice'])

export function parseEmailJob(value: unknown): EmailJob | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const messageId = typeof candidate.messageId === 'string' ? candidate.messageId : candidate.jobId
  const chunkIndex =
    typeof candidate.chunkIndex === 'number' && Number.isInteger(candidate.chunkIndex) ? candidate.chunkIndex : 0
  const chunkCount =
    typeof candidate.chunkCount === 'number' && Number.isInteger(candidate.chunkCount) ? candidate.chunkCount : 1

  if (
    typeof candidate.jobId !== 'string' ||
    typeof messageId !== 'string' ||
    chunkIndex < 0 ||
    chunkCount < 1 ||
    chunkIndex >= chunkCount ||
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
    messageId,
    chunkIndex,
    chunkCount,
    template: candidate.template,
    priority: candidate.priority,
    from: candidate.from,
    to: candidate.to,
    subject: candidate.subject,
    body: candidate.body,
    variables: candidate.variables
  }
}

function isStaleProcessing(updatedAt: string): boolean {
  const updatedAtMs = Date.parse(updatedAt)
  return Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs > PROCESSING_STALE_AFTER_MS
}

async function claimMessage(db: EmailDb, job: EmailJob): Promise<'claimed' | 'skip' | 'retry'> {
  await ensureMessageRecord(db, {
    jobId: job.jobId,
    messageId: job.messageId,
    chunkIndex: job.chunkIndex,
    chunkCount: job.chunkCount,
    template: job.template,
    priority: job.priority,
    subject: job.subject,
    recipientsCount: job.to.length
  })
  const status = await getMessageStatus(db, job.jobId, job.messageId)
  if (status.chunkStatus === 'sent') {
    return 'skip'
  }
  if (status.chunkStatus === 'processing' && !isStaleProcessing(status.updatedAt)) {
    return 'retry'
  }

  const claimed = await tryClaimChunk(db, job.messageId, status.updatedAt)
  return claimed ? 'claimed' : 'retry'
}

export async function queueHandler(messages: readonly QueueMessage[], env: ConsumerEnv): Promise<void> {
  const db = env.DB
  for (const message of messages) {
    try {
      const job = parseEmailJob(message.body)
      if (!job) {
        console.error('Invalid email job payload')
        await message.ack()
        continue
      }

      if (job.to.length === 0) {
        await message.ack()
        continue
      }

      const claim = await claimMessage(db, job)
      if (claim === 'skip') {
        await message.ack()
        continue
      }
      if (claim === 'retry') {
        await message.retry()
        continue
      }

      // Render template once per message
      const { html, text } = await renderTemplate(job.template, job.variables)

      const [visibleRecipient, ...blindCopyRecipients] = job.to
      await env.EMAIL.send({
        to: [visibleRecipient],
        ...(blindCopyRecipients.length > 0 ? { bcc: blindCopyRecipients } : {}),
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

      try {
        await markMessageSent(db, job.jobId, job.messageId)
      } catch (error) {
        console.error('Failed to mark email job as sent:', error)
      }
      await message.ack()
    } catch (error) {
      console.error('Failed to process email job:', error)
      const job = parseEmailJob(message.body)
      if (job) {
        try {
          await markMessageFailed(db, job.jobId, job.messageId, error)
        } catch (markError) {
          console.error('Failed to mark email job as failed:', markError)
        }
      }
      await message.retry()
    }
  }
}
