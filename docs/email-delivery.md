# Email Delivery

## Design

Email delivery is fully asynchronous and decoupled from the request path. No email is sent inside an HTTP handler. The flow is:

```
HTTP handler
  → emailSender.Enqueue()
  → POST /enqueue (email-producer Worker)
  → Cloudflare Queue
  → email-consumer Worker
  → SMTP / Cloudflare Email Routing
```

This means:
- **HTTP handlers are never blocked by SMTP.** A slow mail server cannot cause a request timeout.
- **Delivery failures are isolated.** If the consumer fails, it can retry from the queue without affecting the API.
- **The queue is durable.** Messages survive producer and consumer restarts.

---

## Components

### `emailSender` (Go backend)

`internal/mailworker/` contains the `emailSender` interface and its implementations. Handlers receive it via dependency injection and call `Enqueue(ctx, job)`.

In production (`PORTAL_EMAIL_PRODUCER_URL` set), `Enqueue` does a `POST` to the email-producer Worker. In demo mode or when the producer URL is not configured, it is a no-op (the job is dropped silently).

### `email-producer` Worker (`packages/email-producer/`)

A Cloudflare Worker that:
1. Receives a `POST /enqueue` from the Go backend.
2. Validates the `Authorization` header against `PORTAL_EMAIL_PRODUCER_TOKEN`.
3. Puts the job onto the Cloudflare Queue.

It is stateless — it only bridges the Go backend to the queue. The token prevents unauthorized parties from injecting mail jobs.

### `email-consumer` Worker (`packages/email-consumer/`)

A Cloudflare Worker bound to the queue. It:
1. Receives batched messages from the queue.
2. Sends the email via SMTP or Cloudflare Email Routing.
3. On success, acknowledges the message. On failure, lets it retry according to queue policy.

There are two consumer instances: `high` priority (for time-sensitive mails like verification codes) and `normal` priority (for bulk notifications).

---

## Local development

In local dev, the Cloudflare Queue is not available. The local stack uses Wrangler's `dev:local-stack` mode, which emulates the queue in-process:

```bash
mise run dev:worker
```

This starts the producer and consumer Workers locally and connects them via a Wrangler-managed local queue. Mail is delivered to a local SMTP sink (configurable in the consumer Worker's wrangler config).

For development without email testing, `mise run dev` (without `:worker`) skips the email stack entirely. The Go backend will log a warning when it tries to enqueue and the producer is not reachable.

---

## Mail history

Every successfully enqueued job is written to `mail_queue` in PostgreSQL before being sent to the producer Worker. After delivery, the consumer writes back to `mail_history`. This provides:

- **An audit trail** of what was sent, to whom, and when.
- **A staff UI** to inspect queued and delivered mail.
- **A basis for rate limiting** future bulk sends without re-querying an external service.

The `mail_queue` table is the source of truth for pending mail. If the producer is unavailable when the handler calls `Enqueue`, the job remains in `mail_queue` with status `pending` and can be retried by the staff mail management UI.

---

## Why Cloudflare Workers?

The target deployment environment for PortalDots is small-scale shared hosting or a cheap VPS — environments that typically do not allow long-running background processes or open SMTP connections. Cloudflare Workers run on Cloudflare's edge network and are billed per invocation, so they add near-zero cost at the traffic volumes typical of a festival registration system.

The queue abstraction also means the email backend can be swapped (different SMTP provider, different delivery service) without changing the Go codebase — only the consumer Worker needs to be updated.
