import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { asc, eq } from 'drizzle-orm'
import { createDb, type EmailDb } from '../../db/client'
import { emailJobChunks, emailJobs, type ChunkStatus, type JobStatus } from '../../db/schema'

// `.href`, not the URL object: the ambient `URL` here is the Workers one, which
// is not assignable to the `URL` `node:url` declares.
const migrationsDir = fileURLToPath(new URL('../../../migrations/', import.meta.url).href)

function migrationStatements(): string[] {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
}

function d1Meta(changes: number, lastRowId: number) {
  return {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: changes,
    last_row_id: lastRowId,
    changed_db: changes > 0,
    changes
  }
}

class TestD1Statement implements D1PreparedStatement {
  constructor(
    private readonly db: TestD1Database,
    private readonly query: string,
    private readonly params: unknown[] = []
  ) {}

  bind(...values: unknown[]): TestD1Statement {
    return new TestD1Statement(this.db, this.query, values)
  }

  async first<T>(colName?: string): Promise<T | null> {
    const row = (await this.all<Record<string, unknown>>()).results[0] ?? null
    if (row === null || colName === undefined) {
      return row as T | null
    }
    return row[colName] as T
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async run<T>(): Promise<D1Result<T>> {
    const { changes, lastInsertRowid } = this.db.statement(this.query).run(...this.db.toSqliteParams(this.params))
    return { success: true, results: [], meta: d1Meta(Number(changes), Number(lastInsertRowid)) }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async all<T>(): Promise<D1Result<T>> {
    const results = this.db.statement(this.query).all(...this.db.toSqliteParams(this.params)) as T[]
    return { success: true, results, meta: d1Meta(0, 0) }
  }

  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>
  // eslint-disable-next-line @typescript-eslint/require-await
  async raw(options?: { columnNames?: boolean }): Promise<unknown[]> {
    const statement = this.db.statement(this.query)
    statement.setReturnArrays(true)
    const rows = statement.all(...this.db.toSqliteParams(this.params))
    const columnNames = statement.columns().map((column) => column.name)
    return options?.columnNames ? [columnNames, ...rows] : rows
  }
}

/**
 * D1 binding backed by a real in-memory SQLite database with the generated
 * migrations applied, plus seeding and assertion helpers for tests. Queries run
 * as actual SQL, so a malformed statement fails the test instead of passing
 * through a pattern-matching stub.
 */
export class TestD1Database implements D1Database {
  private readonly sqlite = new DatabaseSync(':memory:')
  private broken = false
  readonly drizzle: EmailDb = createDb(this)

  constructor() {
    for (const statements of migrationStatements()) {
      this.sqlite.exec(statements)
    }
  }

  /** Make every subsequent statement fail, simulating D1 becoming unavailable mid-flight. */
  breakWrites(): void {
    this.broken = true
  }

  async jobStatus(jobId: string): Promise<JobStatus | undefined> {
    const row = await this.drizzle
      .select({ status: emailJobs.status })
      .from(emailJobs)
      .where(eq(emailJobs.jobId, jobId))
      .get()
    return row?.status
  }

  async chunkMessageIds(): Promise<string[]> {
    const rows = await this.drizzle
      .select({ messageId: emailJobChunks.messageId })
      .from(emailJobChunks)
      .orderBy(asc(emailJobChunks.chunkIndex))
    return rows.map((row) => row.messageId)
  }

  async seedJob(job: { jobId: string; status: JobStatus; chunkCount: number }): Promise<void> {
    const now = new Date().toISOString()
    await this.drizzle.insert(emailJobs).values({
      ...job,
      template: 'markdown-notice',
      priority: 'normal',
      subject: 'Test Subject',
      recipientsCount: job.chunkCount,
      createdAt: now,
      updatedAt: now
    })
  }

  async seedChunk(chunk: { messageId: string; jobId: string; chunkIndex: number; status: ChunkStatus }): Promise<void> {
    const now = new Date().toISOString()
    await this.drizzle.insert(emailJobChunks).values({
      ...chunk,
      chunkCount: 1,
      recipientsCount: 1,
      createdAt: now,
      updatedAt: now
    })
  }

  /** @internal Prepare a statement, refusing to run anything once the database is "down". */
  statement(query: string) {
    if (this.broken) {
      throw new Error('D1 unavailable')
    }
    return this.sqlite.prepare(query)
  }

  /** @internal node:sqlite only accepts primitives; D1 never binds anything else here. */
  toSqliteParams(params: unknown[]): (string | number | null)[] {
    return params.map((param) => {
      if (typeof param === 'string' || typeof param === 'number' || param === null) {
        return param
      }
      throw new TypeError(`Unsupported bind value: ${JSON.stringify(param)}`)
    })
  }

  prepare(query: string): TestD1Statement {
    return new TestD1Statement(this, query)
  }

  batch<T>(statements: TestD1Statement[]): Promise<D1Result<T>[]> {
    this.sqlite.exec('BEGIN')
    return Promise.all(statements.map((statement) => statement.run<T>()))
      .then((results) => {
        this.sqlite.exec('COMMIT')
        return results
      })
      .catch((error: unknown) => {
        this.sqlite.exec('ROLLBACK')
        throw error
      })
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async exec(query: string): Promise<D1ExecResult> {
    this.sqlite.exec(query)
    return { count: 0, duration: 0 }
  }

  withSession(): D1DatabaseSession {
    throw new Error('withSession is not supported by the test D1 database')
  }

  dump(): Promise<ArrayBuffer> {
    throw new Error('dump is not supported by the test D1 database')
  }
}
