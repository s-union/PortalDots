# Backend

Go API server for PortalDots.

## Stack

- **Framework**: Echo v4
- **Database**: PostgreSQL 18 (pgx/v5)
- **Query generation**: sqlc
- **Hot reload**: air
- **Migrations**: goose-compatible SQL files under `db/migrations/`

## Directory structure

```text
backend/
├── api/                      # OpenAPI contract (openapi.yaml)
├── db/
│   ├── migrations/           # SQL migration files (goose format)
│   └── queries/              # sqlc query sources (.sql)
├── internal/
│   ├── app/                  # process-level jobs and workers
│   ├── controllers/          # Echo handlers and route registration
│   ├── domain/               # feature-oriented business repositories and services
│   ├── http/server/          # HTTP composition root (wires dependencies → Echo)
│   ├── mailworker/           # local email delivery worker
│   ├── middlewares/          # Echo middleware and request guards
│   ├── models/               # shared HTTP transport models (errors, pagination)
│   ├── platform/             # config loading, DB bootstrap, sqlc store wiring
│   ├── shared/               # cross-cutting helpers
│   └── testutil/             # test helpers
├── scripts/
│   ├── dev.go                # orchestrates local dev stack
│   ├── migrate/main.go       # standalone migration runner
│   ├── seed/main.go          # demo data seeder
│   └── sqlc-smoke/main.go    # verifies generated sqlc queries compile
├── .air.toml                 # air hot-reload config
├── main.go                   # server entrypoint
└── sqlc.yaml                 # sqlc configuration
```

### Domain packages (`internal/domain/`)

Each sub-package owns the repository interface and its implementation for one bounded context:

`activitylog` · `answer` · `auth` · `booth` · `circle` · `contactcategory` · `document` · `form` · `formquestion` · `mailhistory` · `mailqueue` · `page` · `participationtype` · `pendingregistration` · `place` · `portalsetting` · `registrationmail` · `session` · `staffpermission` · `tag` · `useradmin`

### Backend map (concern → file)

| Concern | HTTP entry | Domain | SQL |
| ------- | ---------- | ------ | --- |
| Auth / Session | `controllers/auth*.go`, `session_bootstrap.go`, `staff_verify.go` | `domain/auth`, `domain/session`, `domain/pendingregistration` | `queries/users.sql`, `sessions.sql`, `pending_registrations.sql` |
| Circles | `controllers/circles*.go` | `domain/circle`, `domain/participationtype` | `queries/circles.sql`, `participation_types.sql` |
| Pages | `controllers/pages.go` | `domain/page`, `domain/document` | `queries/pages.sql`, `documents.sql` |
| Forms & Answers | `controllers/forms.go`, `form_answer_*.go` | `domain/form`, `domain/formquestion`, `domain/answer` | `queries/forms.sql`, `form_questions.sql`, `answers.sql` |
| Staff / Users | `controllers/staff_users*.go`, `staff_permissions.go` | `domain/useradmin`, `domain/staffpermission` | `queries/users.sql` |
| Staff / Masters | `controllers/staff_masters.go` | `domain/tag`, `domain/place`, `domain/contactcategory` | `queries/tags.sql`, `places.sql`, `contact_categories.sql` |
| Staff / Admin | `controllers/staff_activity_logs.go`, `staff_mails.go` | `domain/activitylog`, `domain/mailqueue` | `queries/activity_logs.sql` |

For design rationale behind these package boundaries, see [docs/backend.md](../docs/backend.md).

## Configuration

Copy `.env.example` to `.env` at the repository root and adjust:

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORTAL_DATABASE_URL` | `postgres://portaldots:portaldots@127.0.0.1:55432/portaldots_rebuild?sslmode=disable` | PostgreSQL connection string |
| `PORTAL_API_BIND` | `127.0.0.1:8080` | Bind address for the HTTP server |
| `PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE` | `true` | Re-seeds on every startup and exposes the randomly generated verify code in verify/request responses (development only) |
| `PORTAL_EMAIL_PRODUCER_ENABLED` | `false` | Force-enables the email producer even when `PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE=true` |
| `PORTAL_SESSION_TTL_SECONDS` | `86400` | Session cookie lifetime (default 24 h) |
| `PORTAL_EMAIL_PRODUCER_URL` | `http://localhost:8787` | Email producer Worker endpoint |
| `PORTAL_EMAIL_PRODUCER_TOKEN` | `dev-token` | Auth token for the email producer |
| `PORTAL_EMAIL_FROM` | — | From address for outbound mail |

Frontend-facing variables (read by Vite proxy):

| Variable | Default |
| -------- | ------- |
| `VITE_API_BASE_URL` | `/v1` |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:8080` |

## Commands

```bash
# Start with hot reload (requires PORTAL_DATABASE_URL in .env)
mise run backend-dev

# Run all migrations
mise run backend-migrate

# Insert demo data
mise run backend-seed

# Run tests
mise run backend-test

# Run tests with coverage
mise run backend-cover

# Static analysis (staticcheck)
mise run backend-check

# Format
mise run backend-format

# Regenerate sqlc Go code
mise run backend-sqlc-generate

# Smoke-test generated queries against a live DB
mise run backend-sqlc-smoke
```

## Behavior notes

- `main.go` runs SQL migrations on startup before accepting requests.
- Seed data is inserted when the `users` table is empty.
- `PORTAL_DANGEROUSLY_ALLOW_DEMO_MODE=true` re-applies seed data on every startup and exposes the randomly generated verify code in `POST /v1/staff/verify/request` responses (development only).
- Uploaded files (form answers, documents) are stored as binary in PostgreSQL. No external object storage is wired yet.
- Form answers are stored per-question in `answer_details` and `answer_uploads`. Forms with zero questions fall back to `body`-based storage for backwards compatibility.
- UUID generation uses `uuidv7()` — requires PostgreSQL 18+.
- The local PostgreSQL image is `postgres:18`.
