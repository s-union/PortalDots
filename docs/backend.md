# Backend Design

## Technology choices

### Go

Go was chosen over alternatives (Node.js, Python, another PHP framework) for three reasons:

1. **Single static binary.** Deployment is copying a file. No runtime version pinning, no `vendor/` directory, no dynamic linker surprises on cheap shared hosts.
2. **Explicit error handling.** Every failure path is visible in the call chain. There are no unchecked exceptions propagating silently through middleware layers.
3. **Low memory footprint.** PortalDots targets small-scale deployments (single VPS, shared hosting). A Go server idles at ~20 MB; a JVM or Node.js equivalent is an order of magnitude heavier.

### Echo

Echo is a thin HTTP framework that stays close to `net/http`. It was chosen over more opinionated alternatives (Gin, Chi, Fiber) because:

- Middleware composition is explicit and readable.
- It does not impose a project structure, so we can apply our own.
- It handles context propagation, request binding, and response helpers without magic.

### PostgreSQL 18

PostgreSQL was chosen as the sole data store because:

- It handles sessions, file blobs (`answer_uploads`, `documents.content`), and relational data in one place — no Redis, no S3, no separate session store.
- `uuidv7()` is available as an extension, giving time-ordered primary keys without application-level UUID generation.
- Arrays (`tags text[]`) eliminate many join tables for simple many-to-many relationships.

The local dev database runs in Docker (`docker-compose.postgres.yml`) using the same `postgres:18` image as production.

### sqlc (no ORM)

sqlc generates Go from hand-written SQL. The choice against an ORM (GORM, ent) was deliberate:

- **SQL is the interface.** Anyone who knows SQL can read and audit the queries. There is no ORM-specific syntax to learn.
- **No N+1 surprises.** The query is exactly what runs. There is no lazy-loading that becomes a performance problem under load.
- **Type safety without runtime reflection.** sqlc generates typed structs at build time. Wrong column names or type mismatches are caught by the generator, not at runtime.

The generated code lives in `internal/platform/postgres/db/`. Hand-written SQL lives in `db/queries/`. The `sqlc.yaml` file at the repo root ties them together.

---

## Package organization

### `internal/domain/`

Each sub-package is a bounded context. It owns:

- **The entity types** — plain Go structs with no database tags or framework annotations.
- **The repository interface** — what the rest of the system can ask for from that context.
- **Sentinel errors** — `var ErrNotFound = errors.New(...)` etc., so callers can switch on them without importing the implementation.

Example: `internal/domain/circle/catalog.go` defines `Catalog` (the interface), `Circle` (the entity), and `ErrNotFound`, `ErrForbidden`, etc. The handler in `internal/controllers/` imports only the interface. The PostgreSQL implementation in `circle/sqlc.go` is wired at the composition root.

This means the domain layer has no dependency on PostgreSQL, Echo, or any other infrastructure package. It is pure Go.

### `internal/platform/database/`

The composition root for the database layer. `BuildDependencies` opens a connection pool, runs migrations, optionally seeds demo data, and returns a `Dependencies` struct containing one concrete implementation for each domain interface.

`main.go` calls this once and passes the results to the HTTP server. No handler ever imports a sqlc package directly.

### `internal/controllers/`

Echo handlers and route registration. Each handler:

1. Binds and validates the request.
2. Calls one or more domain methods.
3. Maps the result to a JSON response.

Handlers do not contain business logic. They do not touch the database directly. They know only about the domain interface they were given.

### `internal/http/server/`

The HTTP composition root: takes a `Dependencies` struct and wires it into Echo. This is the only file that imports both the domain interfaces and the controllers. It exists to keep the wiring separate from the implementation so that the composition can be changed (e.g., swapping in a mock) without editing handler code.

### `internal/middlewares/`

Middleware that applies to all routes:

- **Rate limiting** — per-IP sliding window, configurable via `PORTAL_RATE_LIMIT_PER_MINUTE`.
- **External ID encode/decode** — rewrites UUID path params and JSON fields on the way in and out so the API never exposes raw internal IDs.
- **Login attempt limiting** — per-identifier exponential backoff on `POST /v1/auth/login`.
- **Structured access log** — one JSON line per request.

---

## Demo mode and static catalog

`config.go` can deserialize a full in-memory dataset from environment variables or config. When `PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE=true`, the server seeds this data into the database on every startup and bypasses the staff verify step.

The static catalog (`circle.StaticCatalog`, etc.) implements the same domain interface as the PostgreSQL-backed implementation. It is used in integration tests and for the demo deployment without any handler changes — the handler only sees the interface.

---

## Migrations

Migration files are SQL in `db/migrations/`, using goose-format comments (`-- +goose Up` / `-- +goose Down`). They run automatically on server startup via `BuildDependencies → Migrate`.

The migration runner is also available as a standalone script:

```bash
mise run backend:migrate
```

All primary keys use `uuidv7()`, which requires the first migration to install the `pgcrypto` extension and a custom `uuidv7()` function. This is done in `0001_init.sql`.

---

## File storage

Uploaded files are stored as `bytea` in PostgreSQL:

- Form answer file uploads: `answer_uploads.content`
- Page documents: `documents.content`

This was a deliberate early choice to avoid external object storage dependencies. The tradeoff is that large file volumes will bloat the database. External storage (S3-compatible) is a future option; the domain interface (`document.Repository`, `answer.Repository`) already abstracts the storage concern.

---

## Activity log

Every staff mutation (create, update, delete for any entity) writes a row to `activity_logs`. The log captures:

- Actor user ID
- Target entity type and ID
- Action type
- Timestamp

This provides a full audit trail without a separate audit system. The log is append-only; no mutation deletes log rows.
