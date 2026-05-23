# AGENTS.md

## Scope

This repository contains PortalDots: a Vue 3 frontend and a Go backend API server. All new work targets these two directories. Any other code in the repository is out of scope.

## Architecture

- `frontend/` — Vue 3 + Vite + TypeScript SPA
- `backend/` — Go + Echo + PostgreSQL API server
- `packages/api-client/` — openapi-typescript generated client shared by the frontend
- `packages/email/` — Cloudflare Worker for email delivery (HTTP enqueue + queue consumer)

Details:

- [`backend/README.md`](backend/README.md)
- [`frontend/README.md`](frontend/README.md)

## Implementation Guidance

- For frontend work, follow the Vue 3 structure under `frontend/src/` and use Composition API with `<script setup>`.
- For backend work, follow the Go package boundaries in `backend/README.md`. Keep domain logic in `internal/domain/`, HTTP wiring in `internal/http/server/`, and handlers in `internal/controllers/`.
- Before adding a dependency, verify the standard library or existing workspace package cannot solve the problem.
- When the OpenAPI contract changes, regenerate the API client with `mise run api:client:codegen` and update both sides together.

## Quality Checks

Run the relevant checks before finishing any change.

```bash
# All checks at once
mise run check

# Backend only
mise run backend:check    # staticcheck
mise run backend:test     # go test ./...
mise run backend:format   # go fmt

# Frontend only
mise run frontend:check   # typecheck + lint + format check
cd frontend && pnpm test  # Vitest
mise run frontend:format  # oxfmt

# Format everything
mise run format
```

## Change Policy

- Preserve existing behavior unless the task explicitly requires a spec change.
- When API shapes change, update `backend/api/openapi.yaml`, regenerate the client, and update the frontend usage in the same PR.
- Do not commit secrets or environment-specific credentials.

## Git

Follow [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages.
