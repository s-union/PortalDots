import { app, fireDueScheduledEmails, type Env as EnqueueEnv } from './enqueue'
import { queueHandler, type ConsumerEnv } from './consumer'

type Env = EnqueueEnv & ConsumerEnv

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => app.fetch(req, env, ctx),
  queue: (batch: MessageBatch<unknown>, env: Env) => queueHandler(batch, env),
  scheduled: (_event: ScheduledController, env: Env, ctx: ExecutionContext) =>
    ctx.waitUntil(fireDueScheduledEmails(env).catch((error) => console.error('Scheduled fire failed', { error })))
} satisfies ExportedHandler<Env>
