# Backend Foundation

This directory contains the Go backend for PortalDots.

## Structure

```text
backend/
├── api/                    # OpenAPI contract
├── cmd/                    # executable entrypoints
├── db/                     # migrations and sqlc query sources
└── internal/
    ├── app/               # app-level jobs and workers
    ├── domain/            # business repositories and domain services
    ├── platform/          # config, database wiring, postgres helpers
    └── presentation/      # HTTP handlers and API surface
```

Rules of thumb:

- `cmd/*`: only program startup and wiring for CLI / server processes.
- `internal/domain`: feature-oriented business code such as `form`, `page`, `useradmin`.
- `internal/platform`: infrastructure code such as config loading, SQLC store wiring, and generated PostgreSQL access.
- `internal/presentation/httpapi`: Echo handlers and request/response mapping.
  - `controllers`: route registration and handler binding
  - `middlewares`: Echo middleware setup
  - `models`: shared API transport models (errors/pagination, etc.)

Current scope:

- Echo server skeleton
- OpenAPI contract starter
- sqlc configuration
- sqlc generated package under `internal/platform/postgres/db`
- optional sqlc smoke command under `cmd/sqlc-smoke`
- `cmd/api` now wires sqlc-backed repositories and session storage for the production path
- goose-compatible migration directory
- login / logout / session bootstrap
- staff verification request / status / confirm
- staff current-circle pages list / create
- staff current-circle documents list / upload / download
- staff tags list / create / update / delete
- staff places list / create / update / delete
- staff contact categories list / create / update / delete
- staff current-circle forms list / create / detail
- staff current-circle forms update / question editor / per-question answer preview / upload download
- staff circle list / create / detail / update
- staff user list / detail / role update
- staff activity log list
- staff current-circle exports (`summary.csv`, `bundle.zip`)
- staff mail queue list / enqueue
- one-shot worker command to mark queued mail jobs as sent
- circle selection context
- current-circle pages list / detail / search
- current-circle documents list / detail / download
- current-circle forms list / detail / question-based answer save
- current-circle per-question answer file upload / download

Useful commands:

- `PORTALDOTS_DATABASE_URL=postgres://... mise run backend-migrate`
- `mise run backend-sqlc-generate`
- `PORTALDOTS_DATABASE_URL=postgres://... mise run backend-sqlc-smoke`
- `PORTALDOTS_DATABASE_URL=postgres://... PORTALDOTS_STAFF_VERIFY_CODE=... go run ./cmd/api`

Behavior notes:

- `cmd/api` runs SQL migrations on startup before wiring repositories.
- Seed data is inserted only when the database is empty (`users` count is zero).
- Demo users are seeded and synchronized only when `PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true`.
- `cmd/api` requires an explicit non-default value for `PORTALDOTS_STAFF_VERIFY_CODE` unless `PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true` is set.
- Session cookies now use `PORTALDOTS_SESSION_TTL_SECONDS` and default to 12 hours.
- Staff verify email delivery is currently mocked. `POST /v1/staff/verify/request` does not send a real email and returns the verification code for UI display.
- When `PORTALDOTS_ALLOW_INSECURE_DEFAULTS=true` (demo mode), staff endpoints treat staff users as already authorized without an extra verify step.
- 現在の upload 保存先は PostgreSQL です。`answer_uploads` と `documents.content` にバイナリを直接保存しており、外部ストレージ連携はまだありません。
- form answer は `answer_details` と `question_id 付き answer_uploads` で保持しています。設問が 0 件の既存フォームだけは後方互換のため `body` ベースでも保存できます。
- staff form editor は設問の追加、更新、削除、並び替えまで実装済みです。participant / staff ともに設問ベースの回答表示に切り替わっています。
