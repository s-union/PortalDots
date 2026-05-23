export interface D1RunResult {
  meta: { changes: number }
  results: unknown[]
  success: true
}

export class TestD1Statement {
  private values: unknown[] = []

  constructor(
    private readonly query: string,
    private readonly db: TestD1Database
  ) {}

  bind(...values: unknown[]): TestD1Statement {
    this.values = values
    return this
  }

  async run(): Promise<D1RunResult> {
    return this.db.run(this.query, this.values)
  }

  async first<T>(): Promise<T | null> {
    return this.db.first<T>(this.query, this.values)
  }
}

export function runResult(changes: number): D1RunResult {
  return {
    success: true,
    results: [],
    meta: { changes }
  }
}

/**
 * In-memory D1 stub for unit tests.
 * Supports both the enqueue (producer) and consumer query patterns.
 */
export class TestD1Database {
  readonly jobs = new Map<string, { status: string; chunkCount?: number }>()
  readonly chunks = new Map<string, { jobId: string; status: string; updatedAt: string }>()
  failSentUpdate = false

  prepare(query: string): TestD1Statement {
    return new TestD1Statement(query, this)
  }

  async batch(statements: TestD1Statement[]): Promise<D1RunResult[]> {
    return Promise.all(statements.map((statement) => statement.run()))
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async run(query: string, values: unknown[]): Promise<D1RunResult> {
    // --- producer patterns (strict INSERT) ---
    if (query.includes('INSERT INTO email_jobs') && !query.includes('OR IGNORE')) {
      const jobId = String(values[0])
      if (this.jobs.has(jobId)) {
        throw new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: email_jobs.job_id')
      }
      this.jobs.set(jobId, { status: 'queued', chunkCount: Number(values[5]) })
      return runResult(1)
    }
    if (query.includes('INSERT INTO email_job_chunks') && !query.includes('OR IGNORE')) {
      const messageId = String(values[0])
      this.chunks.set(messageId, { jobId: String(values[1]), status: 'queued', updatedAt: String(values[6]) })
      return runResult(1)
    }

    // --- consumer patterns (INSERT OR IGNORE) ---
    if (query.includes('INSERT OR IGNORE INTO email_jobs')) {
      const jobId = String(values[0])
      if (!this.jobs.has(jobId)) {
        this.jobs.set(jobId, { status: 'queued' })
        return runResult(1)
      }
      return runResult(0)
    }
    if (query.includes('INSERT OR IGNORE INTO email_job_chunks')) {
      const messageId = String(values[0])
      if (!this.chunks.has(messageId)) {
        this.chunks.set(messageId, { jobId: String(values[1]), status: 'queued', updatedAt: String(values[6]) })
        return runResult(1)
      }
      return runResult(0)
    }

    // --- shared update patterns ---
    if (query.includes("SET status = 'processing'")) {
      const messageId = String(values[1])
      const chunk = this.chunks.get(messageId)
      if (!chunk) return runResult(0)
      if (
        chunk.status === 'queued' ||
        chunk.status === 'enqueue_failed' ||
        (chunk.status === 'processing' && chunk.updatedAt === values[2])
      ) {
        chunk.status = 'processing'
        chunk.updatedAt = String(values[0])
        return runResult(1)
      }
      return runResult(0)
    }
    if (query.includes("UPDATE email_job_chunks SET status = 'sent'")) {
      if (this.failSentUpdate) {
        throw new Error('D1 unavailable')
      }
      const chunk = this.chunks.get(String(values[1]))
      if (chunk) {
        chunk.status = 'sent'
        chunk.updatedAt = String(values[0])
      }
      return runResult(chunk ? 1 : 0)
    }
    if (query.includes('UPDATE email_jobs') && query.includes("SET status = 'sent'")) {
      const jobId = String(values[1])
      const hasUnsentChunks = Array.from(this.chunks.values()).some(
        (chunk) => chunk.jobId === jobId && chunk.status !== 'sent'
      )
      const job = this.jobs.get(jobId)
      if (job && !hasUnsentChunks) {
        job.status = 'sent'
        return runResult(1)
      }
      return runResult(0)
    }
    if (query.includes("UPDATE email_jobs SET status = 'queued'")) {
      const job = this.jobs.get(String(values[1]))
      if (job) job.status = 'queued'
      return runResult(job ? 1 : 0)
    }
    if (query.includes("UPDATE email_jobs SET status = 'enqueue_failed'")) {
      const job = this.jobs.get(String(values[2]))
      if (job) job.status = 'enqueue_failed'
      return runResult(job ? 1 : 0)
    }
    if (query.includes("SET status = 'enqueue_failed'") && query.includes('email_job_chunks')) {
      const chunk = this.chunks.get(String(values[2]))
      if (chunk) chunk.status = 'enqueue_failed'
      return runResult(chunk ? 1 : 0)
    }
    return runResult(0)
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async first<T>(query: string, values: unknown[]): Promise<T | null> {
    if (query.includes('SELECT status FROM email_jobs')) {
      const job = this.jobs.get(String(values[0]))
      return (job ? { status: job.status } : null) as T | null
    }
    if (query.includes('FROM email_jobs') && query.includes('JOIN email_job_chunks')) {
      const job = this.jobs.get(String(values[0]))
      const chunk = this.chunks.get(String(values[1]))
      if (!job || !chunk) return null
      return {
        job_status: job.status,
        chunk_status: chunk.status,
        chunk_updated_at: chunk.updatedAt
      } as T
    }
    return null
  }
}
