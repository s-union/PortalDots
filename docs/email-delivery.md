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

It is stateless — it only bridges the Go backend to the queue. The token prevents unauthorized parties from injecting mail jobs.

**Consumer (`queue` handler):**
1. Receives batched messages from the queue.
2. Sends the email via SMTP or Cloudflare Email Routing.
3. On success, acknowledges the message. On failure, lets it retry according to queue policy.

Two queues are configured with different batch settings: `email-high` (for time-sensitive mails like verification codes, batch size 1) and `email-normal` (for bulk notifications, batch size 10).

---

## Local development

In local dev, the Cloudflare Queue is not available. The local stack uses Wrangler's `dev:local-stack` mode, which emulates the queue in-process:

```bash
mise run dev:worker
```

This starts the email Worker locally with a Wrangler-managed local queue. Mail is delivered to a local SMTP sink (configurable in the Worker's wrangler config).

For development without email testing, `mise run dev` (without `:worker`) skips the email stack entirely. The Go backend will log a warning when it tries to enqueue and the Worker is not reachable.

---

## Mail history

Every successfully enqueued job is written to `mail_queue` in PostgreSQL before being sent to the email Worker. After delivery, the consumer writes back to `mail_history`. This provides:

- **An audit trail** of what was sent, to whom, and when.
- **A staff UI** to inspect queued and delivered mail.
- **A basis for rate limiting** future bulk sends without re-querying an external service.

The `mail_queue` table is the source of truth for pending mail. If the Worker is unavailable when the handler calls `Enqueue`, the job remains in `mail_queue` with status `pending` and can be retried by the staff mail management UI.

---

## Why Cloudflare Workers?

The target deployment environment for PortalDots is small-scale shared hosting or a cheap VPS — environments that typically do not allow long-running background processes or open SMTP connections. Cloudflare Workers run on Cloudflare's edge network and are billed per invocation, so they add near-zero cost at the traffic volumes typical of a festival registration system.

The queue abstraction also means the email backend can be swapped (different SMTP provider, different delivery service) without changing the Go codebase — only the Worker needs to be updated.
