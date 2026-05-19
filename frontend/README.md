# Frontend

Vue 3 SPA for PortalDots.

## Stack

- **Framework**: Vue 3 (Composition API + `<script setup>`)
- **Build tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State / data fetching**: Pinia · TanStack Query v5
- **Routing**: Vue Router v5
- **Validation**: Zod
- **API client**: `@portaldots/api-client` (openapi-fetch + openapi-typescript)
- **Testing**: Vitest · Playwright
- **Component explorer**: Storybook 10

## Directory structure

```text
frontend/
├── src/
│   ├── app/          # app bootstrap, router wiring — no component implementations
│   ├── components/   # reusable UI and layout primitives
│   ├── features/     # domain APIs, feature components, composables, stores
│   │   ├── auth/
│   │   ├── circles/
│   │   ├── documents/
│   │   ├── forms/
│   │   ├── pages/
│   │   ├── session/
│   │   ├── staff/
│   │   └── ...
│   ├── lib/          # pure utilities with no Vue dependency
│   ├── mocks/        # MSW request handlers (dev + test)
│   ├── pages/        # route-level shells grouped by area
│   ├── shared/       # cross-feature Vue helpers
│   ├── stories/      # Storybook stories
│   ├── styles/       # global CSS (Tailwind base, design tokens)
│   └── test/         # Vitest setup and test utilities
└── tests/
    └── e2e/          # Playwright tests
```

### Placement rules

| What                                  | Where                                 |
| ------------------------------------- | ------------------------------------- |
| New route page                        | `src/pages/<area>/`                   |
| Reusable UI / layout component        | `src/components/<domain>/`            |
| Feature screen or editor              | `src/features/<feature>/components/`  |
| Feature API calls and Vue Query hooks | `src/features/<feature>/api.ts`       |
| Feature composable / local state      | `src/features/<feature>/composables/` |
| Feature Pinia store                   | `src/features/<feature>/store.ts`     |
| App bootstrap / router composition    | `src/app/`                            |

### Feature module structure

Each feature directory may contain any of:

```text
features/<feature>/
├── api.ts          # openapi-fetch calls + Vue Query hooks
├── components/     # feature-owned screens and editors
├── composables/    # orchestration and local UI state
└── store.ts        # Pinia store (only if global state is needed)
```

## API client

The `@portaldots/api-client` workspace package wraps the OpenAPI schema and exposes typed fetch helpers and Vue Query composables.

To regenerate types after changing `backend/api/openapi.yaml`:

```bash
mise run api:client:codegen
```

## Commands

Run from the repository root via mise, or directly inside `frontend/` with pnpm.

```bash
# Dev server (usually started via `mise run dev` at the root)
mise run frontend:dev
# or
cd frontend && pnpm dev

# Type check
cd frontend && pnpm typecheck

# Lint
cd frontend && pnpm lint

# Format
mise run frontend:format
# or
cd frontend && pnpm format

# All static checks (typecheck + lint + format check)
mise run frontend:check
# or
cd frontend && pnpm ci:check

# Unit tests (Vitest)
cd frontend && pnpm test

# Unit tests — watch mode
cd frontend && pnpm test:watch

# Unit tests — coverage
cd frontend && pnpm test:coverage

# E2E tests (Playwright, against preview server)
cd frontend && pnpm test:e2e

# Integration tests (Playwright, against live dev:worker stack)
mise run e2e:worker

# Storybook
cd frontend && pnpm storybook

# Production build
cd frontend && pnpm build
```
