<h1>
    <picture>
        <source srcset="https://raw.githubusercontent.com/portaldots/PortalDots/5.x/resources/img/portalDotsLogoLight.svg" media="(prefers-color-scheme: light)">
        <source srcset="https://raw.githubusercontent.com/portaldots/PortalDots/5.x/resources/img/portalDotsLogoDark.svg" media="(prefers-color-scheme: dark)">
        <img src="https://raw.githubusercontent.com/portaldots/PortalDots/5.x/resources/img/portalDotsLogoLight.svg" alt="PortalDots" width="245" height="40">
    </picture>
</h1>

Open-source web system for communication between university festival committees and participating groups.

<p>
    <a href="https://codecov.io/gh/portaldots/PortalDots">
        <img src="https://codecov.io/gh/portaldots/PortalDots/branch/5.x/graph/badge.svg" />
    </a>
    <a href="https://opensource.org/licenses/MIT">
        <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
    </a>
</p>

## What is PortalDots?

PortalDots is a web system that supports communication between festival executive committees and participating group representatives. It handles participant registration, form submissions, document distribution, and bulk email delivery — all in one place.

Developed by a volunteer team with university festival committee experience. Free and open source under the [MIT License](LICENSE).

## Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | Vue 3 · Vite · TypeScript · Tailwind CSS v4 |
| Backend | Go · Echo · PostgreSQL 18 |
| DB access | sqlc · pgx/v5 |
| API contract | OpenAPI 3.x at `backend/api/openapi.yaml` |
| Email delivery | Cloudflare Workers Queue (email-producer / email-consumer) |
| Task runner | [mise](https://mise.jdx.dev/) |
| Package manager | pnpm (workspace) |

## Repository layout

```text
PortalDots/
├── backend/              # Go API server
├── frontend/             # Vue 3 SPA
├── packages/
│   ├── api-client/       # openapi-typescript generated client
│   ├── email-producer/   # Cloudflare Worker: enqueue outbound mail
│   └── email-consumer/   # Cloudflare Worker: deliver queued mail
└── mise.toml             # task runner config
```

## Development setup

### Prerequisites

- [mise](https://mise.jdx.dev/) — manages Go, Node.js, sqlc, air, and other tools
- Docker — runs the local PostgreSQL container
- pnpm — installed globally against the mise-managed Node.js

### Steps

```bash
# 1. Clone
git clone git@github.com:s-union/PortalDots.git
cd PortalDots

# 2. Install all managed tools (Go, Node.js, sqlc, air, …)
mise install

# 3. Install Node.js packages
pnpm install

# 4. Configure backend environment
cp .env.example backend/.env
# Edit backend/.env as needed (see backend/README.md for all variables)

# 5. Start the dev stack
#    Resets the local DB, runs migrations + seed, then starts backend and frontend
mise run dev
```

Once running:

| Service | URL |
| ------- | --- |
| Frontend (Vite) | http://127.0.0.1:5173 |
| Backend API | http://127.0.0.1:8080 |
| PostgreSQL | localhost:55432 |

To also start the email Workers local stack:

```bash
mise run dev:worker
```

### Common commands

```bash
# Static checks — all at once
mise run check

# Format
mise run format            # Go + frontend together
mise run backend-format    # Go only
mise run frontend-format   # frontend only

# Tests
mise run backend-test      # Go tests
cd frontend && pnpm test   # Vitest unit tests
mise run e2e:worker        # Playwright integration tests (requires dev:worker)

# Database
mise run backend-migrate   # apply pending migrations
mise run backend-seed      # insert demo data
mise run db:delete         # destroy local DB volume

# API client type generation
mise run frontend-generate
```

For stack-specific details see:

- [`backend/README.md`](backend/README.md)
- [`frontend/README.md`](frontend/README.md)

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

[MIT License](LICENSE)
