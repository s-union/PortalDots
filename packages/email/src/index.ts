import { app, type EmailJob } from './enqueue'
import { queueHandler } from './consumer'
import { createDb } from './db/client'
import type { JobQueue, MailTransport, OutgoingMessage, QueueMessage } from './ports'

type CfEnv = {
  HIGH_QUEUE: Queue<EmailJob>
  NORMAL_QUEUE: Queue<EmailJob>
  DB: D1Database
  AUTH_TOKEN: string
  EMAIL: SendEmail
}

function adaptQueue(queue: Queue<EmailJob>): JobQueue<EmailJob> {
  return { send: (message) => queue.send(message).then(() => undefined) }
}

function adaptMailTransport(email: SendEmail): MailTransport {
  return {
    send: ({ to, from, subject, html, text }: OutgoingMessage) =>
      email.send({ from, to, subject, html, text }).then(() => undefined)
  }
}

// Cloudflare's Message.ack()/retry() are synchronous (runtime-buffered), so wrap
// each one to satisfy the platform-neutral QueueMessage port.
function adaptQueueMessage<T>(message: Message<T>): QueueMessage<T> {
  return {
    body: message.body,
    ack: () => Promise.resolve(message.ack()),
    retry: () => Promise.resolve(message.retry())
  }
}

export default {
  fetch: (req: Request, env: CfEnv, ctx: ExecutionContext) =>
    app.fetch(
      req,
      {
        HIGH_QUEUE: adaptQueue(env.HIGH_QUEUE),
        NORMAL_QUEUE: adaptQueue(env.NORMAL_QUEUE),
        DB: createDb(env.DB),
        AUTH_TOKEN: env.AUTH_TOKEN
      },
      ctx
    ),
  queue: (batch: MessageBatch<unknown>, env: CfEnv) =>
    queueHandler(batch.messages.map(adaptQueueMessage), { DB: createDb(env.DB), EMAIL: adaptMailTransport(env.EMAIL) })
} satisfies ExportedHandler<CfEnv>
