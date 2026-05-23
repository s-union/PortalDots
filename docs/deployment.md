# Deployment Guide (s-union internal)

## Architecture

| Component | Host |
| --------- | ---- |
| Backend + PostgreSQL | VPS (Docker Compose) |
| Frontend | Cloudflare Pages (or equivalent CDN) |
| Email delivery | Cloudflare Workers (email Worker) |

---

## Prerequisites

- Docker and Docker Compose installed on the VPS
- Cloudflare account and Wrangler CLI (`npx wrangler`) configured
- Reverse proxy (Nginx, Caddy, etc.) terminating TLS in front of port 8080 (out of scope for this guide)

---

## 1. Environment variables

Copy `.env.example` to `.env.prod` and set the following variables.

```bash
cp .env.example .env.prod
```

### Required changes for production

Generate random values for secrets before filling in the table below:

```bash
openssl rand -base64 32
```

| Variable | Description |
| -------- | ----------- |
| `APP_URL` | The production HTTPS URL (e.g. `https://portal.example.com`) |
| `POSTGRES_PASSWORD` | PostgreSQL password. **Use a randomly generated value.** Used by both the `postgres` container and `PORTAL_DATABASE_URL`. |
| `PORTAL_DATABASE_URL` | PostgreSQL connection string. Use the Compose service name: `postgres://portaldots:${POSTGRES_PASSWORD}@postgres:5432/portaldots?sslmode=disable` |
| `PORTAL_SESSION_COOKIE_SECURE` | Set to `true` (HTTPS required). |
| `PORTAL_EMAIL_PRODUCER_URL` | Endpoint URL of the deployed email Worker. |
| `PORTAL_EMAIL_PRODUCER_TOKEN` | Auth token for the email Worker. **Use a randomly generated value** (must match the secret set in Wrangler). |
| `PORTAL_EMAIL_FROM` | Sender address for outbound mail. |
| `PORTAL_ADMIN_NAME` | Organization name shown in the UI (e.g. `〇〇実行委員会`). |
| `PORTAL_CONTACT_EMAIL` | Contact email address shown to users. |
| `PORTAL_UNIVEMAIL_DOMAIN_PART` | University email domain (e.g. `ed.example.ac.jp`). |
| `VITE_API_BASE_URL` | Backend API base URL baked into the frontend bundle at build time. Set to the absolute URL of the backend (e.g. `https://portal.example.com/v1`). Defaults to `/v1`, which only works if the frontend and backend share the same origin. |

### Production mode flags

```bash
PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE=false
PORTAL_SESSION_COOKIE_SECURE=true
```

`PORTAL_API_BIND` does not need to be set in `.env.prod`; `docker-compose.prod.yml` overrides it to `:8080`.

---

## 2. Start the backend

```bash
# Build the image
docker compose -f docker-compose.prod.yml --env-file .env.prod build

# Start in the background
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

`--env-file .env.prod` makes Docker Compose read variable substitutions (e.g. `${POSTGRES_PASSWORD}`) from `.env.prod` instead of the default `.env`.

SQL migrations run automatically on startup (`main.go` → `database.BuildDependencies` → `Migrate`). No manual migration step is required on first deploy or after an upgrade.

### Useful commands

```bash
# Tail logs
docker compose -f docker-compose.prod.yml logs -f api

# Stop
docker compose -f docker-compose.prod.yml down

# Restart after a config change
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate api
```

---

## 3. Deploy Cloudflare Workers (email delivery)

```bash
cd packages/email

# Set the production secret — must match PORTAL_EMAIL_PRODUCER_TOKEN in .env.prod
echo "<AUTH_TOKEN>" | npx wrangler secret put AUTH_TOKEN

npx wrangler deploy
```

For Cloudflare Queue creation and Email Routing configuration, see the [Cloudflare Workers documentation](https://developers.cloudflare.com/queues/).

---

## 4. Production checklist

- [ ] `APP_URL` starts with `https://`
- [ ] `PORTAL_SESSION_COOKIE_SECURE=true`
- [ ] `PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE=false`
- [ ] `POSTGRES_PASSWORD` is randomly generated (not the dev default)
- [ ] `PORTAL_EMAIL_PRODUCER_TOKEN` is randomly generated and matches the Wrangler secret
- [ ] `PORTAL_EMAIL_PRODUCER_URL` and `PORTAL_EMAIL_PRODUCER_TOKEN` are set
- [ ] PostgreSQL data volume backup is configured
- [ ] email Worker is deployed to Cloudflare
- [ ] Reverse proxy forwards traffic to port `8080` with a valid TLS certificate
