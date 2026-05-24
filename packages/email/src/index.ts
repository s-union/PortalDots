import { app, type Env as EnqueueEnv } from './enqueue'
import { queueHandler, type ConsumerEnv } from './consumer'

type Env = EnqueueEnv & ConsumerEnv

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => app.fetch(req, env, ctx),
  queue: (batch: MessageBatch<unknown>, env: Env) => queueHandler(batch, env)
} satisfies ExportedHandler<Env>
