# Email Delivery

## Design

Email delivery is fully asynchronous and decoupled from the request path. No email is sent inside an HTTP handler. The flow is:

```
HTTP handler
  → emailSender.Enqueue()
  → POST /enqueue (email Worker)
  → Cloudflare Queue
  → email Worker (queue consumer)
  → SMTP / Cloudflare Email Routing
```

This means:

- **HTTP handlers are never blocked by SMTP.** A slow mail server cannot cause a request timeout.
- **Delivery failures are isolated.** If the consumer fails, it can retry from the queue without affecting the API.
- **The queue is durable.** Messages survive worker restarts.

---

## Components

### `emailSender` (Go backend)

The Go-side email enqueueing implementation lives under `backend/internal/shared/cloudflareemail/` and is wired into the relevant handlers/services via dependency injection. Callers use the injected `emailSender` and call `Enqueue(ctx, job)`.

In production (`PORTAL_EMAIL_PRODUCER_URL` set), `Enqueue` does a `POST` to the email Worker. In demo mode or when the producer URL is not configured, it is a no-op (the job is dropped silently).

### `email` Worker (`packages/email/`)

A single Cloudflare Worker that acts as both producer and consumer:

**Producer (`fetch` handler):**

1. Receives a `POST /enqueue` from the Go backend.
2. Validates the `Authorization` header in the form `Bearer ${AUTH_TOKEN}`.
3. Puts the job onto the Cloudflare Queue.

The producer accepts at most 500 recipients per request and sends them in chunks of 50, keeping each request to ten queue subrequests or fewer.

The Worker holds no scheduling state: it bridges the Go backend to the queue and nothing else decides _when_ mail goes out. The token prevents unauthorized parties from injecting mail jobs.

The one thing it does persist is idempotency bookkeeping in D1 (`email_jobs`, `email_job_chunks`), keyed by the caller's `jobId`. A chunk row is written only after the queue has accepted that chunk, and its message ID includes a hash of the recipient chunk. Retrying the same payload sends exactly the chunks that were never accepted and nothing else; changing the recipient set for an existing job is rejected with `409` so index shifts cannot silently skip or duplicate recipients. That is what makes `POST /enqueue` safe to call repeatedly, which the scheduled announcement mail path below relies on.

Drizzle owns that schema: it is declared in `src/db/schema.ts`, `pnpm run db:generate` turns a change to it into a migration under `migrations/`, and `pnpm run dev:local-stack` (local) and `pnpm run deploy` (production) apply pending migrations before the Worker starts serving.

**Consumer (`queue` handler):**

1. Receives batched messages from the queue.
2. Sends the email via SMTP or Cloudflare Email Routing.
3. On success, acknowledges the message. On failure, lets it retry according to queue policy; after the retry limit, Cloudflare Queues moves the message to the configured dead-letter queue instead of dropping it.

Two queues are configured with different batch settings: `email-high` (for time-sensitive mails like verification codes, batch size 1) and `email-normal` (for bulk notifications, batch size 10). Both have a dead-letter queue for operator inspection after retries are exhausted.

---

## Scheduled announcement mail

A staff page ("announcement") can be published at a future time, and its announcement email is delivered at that same moment. PostgreSQL owns the schedule end to end; the Worker is not involved until the mail is actually due.

`scheduled_page_mails` stores only the _intent_ to send: a page ID, a stable job ID, and the staff member who asked for it. It deliberately holds neither the send time nor the mail body. Both are derived from the live `pages` row when the mail is dispatched, which is what makes the rest of the feature fall out for free:

| Staff action                   | What makes it take effect                  |
| ------------------------------ | ------------------------------------------ |
| Deletes the page               | `ON DELETE CASCADE` removes the intent row |
| Unpublishes the page           | The due query stops matching it            |
| Moves the publish time         | The due query reads the new `published_at` |
| Edits the body or the audience | The mail is rendered at dispatch time      |

`pagemail.Dispatcher` (`backend/internal/domain/pagemail/`) runs in-process, once a minute, started from `main.go` on a context cancelled by `SIGINT`/`SIGTERM`. Each tick claims due rows with `FOR UPDATE ... SKIP LOCKED`, re-reads each page, rebuilds the mail from it, and calls the Worker's `POST /enqueue`. A page is due only when it is publicly visible — `is_public = true AND published_at <= now()` — the same predicate the public API filters on, so mail can never precede visibility.

Failures return the row to `pending` and count an attempt; after a handful of attempts the row moves to a terminal `failed` state so that one broken announcement cannot occupy the batch and starve later mail. A process that dies mid-dispatch leaves a row claimed; those are reclaimed after a timeout, and retrying is safe because the job ID is stable and the Worker deduplicates each content-addressed chunk.

Two consequences worth knowing:

- Recipients are resolved **at delivery time**, not when the mail was scheduled. Somebody who joins between scheduling and publication receives it; somebody who loses access does not.
- "Publish now" means "within about a minute", since delivery rides the same one-minute tick.

Only operators holding the `pages.sendEmails` capability can create, retarget or clear a scheduled mail. Editing a page without that capability leaves any pending mail untouched.

---

## Local development

In local dev, the Cloudflare Queue is not available. The local stack uses Wrangler's `dev:local-stack` mode, which emulates the queue in-process:

```bash
mise run dev:worker
```

This starts the email Worker locally with a Wrangler-managed local queue. Mail is delivered to a local SMTP sink (configurable in the Worker's wrangler config).

For development without email testing, `mise run dev` (without `:worker`) skips the email stack entirely. The Go backend will log a warning when it tries to enqueue and the Worker is not reachable.

Migration filenames are part of Wrangler D1's applied-migration history. Keep the existing `0001_email_job_status.sql` filename when deploying upgrades; do not renumber an applied migration. If a local D1 database reports `table already exists` after a stale migration state, delete the local Wrangler state and let it recreate the database from scratch:

```bash
rm -rf packages/email/.wrangler
```

This only affects the local development database; production D1 is unaffected.

---

## Mail history

Every job is recorded in `outbound_mails` (PostgreSQL) before being sent to the email Worker. The `RecordingSender` decorator wraps the actual sender: it writes the job to `outbound_mails` first, then calls the Worker's `POST /enqueue`. This provides:

- **An audit trail** of what was enqueued, to whom, and when.
- **A staff UI** to inspect sent mail.

`outbound_mails` is a write-once history log — it has no status column and does not track delivery state. The source of truth for delivery progress (pending / processing / sent) lives in the Worker's D1 tables (`email_jobs`, `email_job_chunks`). If the Worker is unavailable when the handler calls `Enqueue`, the record in `outbound_mails` still exists, but the mail is not retried automatically; the caller must re-enqueue the job.

---

## Why Cloudflare Workers?

The target deployment environment for PortalDots is small-scale shared hosting or a cheap VPS — environments that typically do not allow long-running background processes or open SMTP connections. Cloudflare Workers run on Cloudflare's edge network and are billed per invocation, so they add near-zero cost at the traffic volumes typical of a festival registration system.

The queue abstraction also means the email backend can be swapped (different SMTP provider, different delivery service) without changing the Go codebase — only the Worker needs to be updated.
