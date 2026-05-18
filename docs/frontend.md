# Frontend Design

## Technology choices

### Vue 3 with Composition API

Vue was chosen over React or Svelte because:

- **Composition API with `<script setup>`** gives fine-grained reactivity without the boilerplate of class components or the ergonomic rough edges of React hooks.
- **Single-file components** keep template, logic, and styles colocated, which fits the feature-first layout without cross-file hopping.
- **TypeScript support** is first-class via `vue-tsc` / `vue-tsgo` and `@vue/tsconfig`.

All components use `<script setup lang="ts">`. Options API is not used anywhere in the codebase.

### TanStack Query

Server state (data that lives on the backend) is managed by TanStack Query, not Pinia. The distinction matters:

- **TanStack Query** handles server state: caching, background refetch, stale-while-revalidate, mutation lifecycle, optimistic updates.
- **Pinia** handles client-only UI state: things that have no server representation (modal open/closed, multi-step wizard progress).

Using an ORM-like cache for server state avoids the pattern of duplicating server data into a Pinia store and then keeping the two in sync.

### Tailwind CSS v4

Utility-first CSS was chosen to avoid the specificity conflicts and naming overhead of BEM-style component CSS. Tailwind v4 uses a native CSS engine (no PostCSS plugin), which makes the dev-time build faster and the output smaller.

Dark mode is implemented via `@media (prefers-color-scheme: dark)` only — no class-based toggle.

### openapi-fetch + openapi-typescript

The API client is generated from `backend/api/openapi.yaml`. This means:

- **No manually maintained type definitions** for request/response shapes.
- **End-to-end type safety**: if the backend changes a field name, the TypeScript compiler flags the frontend consumer before it ships.
- **Automatic documentation**: the OpenAPI spec is always current because it is the source of truth, not a documentation artifact written after the fact.

`openapi-fetch` wraps `fetch` with the generated types, so every call site gets full autocomplete for paths, query params, request bodies, and response shapes.

---

## Directory layout and rules

### `src/pages/`

Route shells only. A page file mounts one feature component and nothing else. No data fetching, no conditional rendering, no business logic.

```vue
<!-- src/pages/staff/circles/index.vue -->
<script setup lang="ts">
import StaffCirclesPage from '@/features/staff/circles/components/StaffCirclesPage.vue'
</script>
<template><StaffCirclesPage /></template>
```

This makes it trivial to see all routes at a glance without reading component internals.

### `src/features/`

The main work area. Each feature owns its API layer, components, composables, and store if needed.

```
features/<feature>/
├── api.ts          # TanStack Query hooks wrapping openapi-fetch calls
├── components/     # feature-owned screens and editors
├── composables/    # orchestration and local state (no network calls)
└── store.ts        # Pinia store — only if state must outlive the component
```

The rule: if something is owned by one feature, it lives here. If it is used by two features, it moves to `src/components/` or `src/shared/`.

### `src/components/`

Reusable presentational primitives: buttons, inputs, modals, data grids, layout wrappers. These components:

- Accept data via props.
- Emit events up.
- Do not call the API.
- Do not import from `src/features/`.

### `src/app/`

App bootstrap: router definition, global plugin registration, top-level error boundaries. Nothing here should contain UI.

---

## Data fetching pattern

Every API call goes through a composable in `features/<feature>/api.ts` that returns a TanStack Query result:

```ts
// features/circles/api.ts
export function useCircle(circleId: Ref<string>) {
  return useQuery({
    queryKey: ['circles', circleId],
    queryFn: () => apiClient.GET('/v1/circles/{circleId}', {
      params: { path: { circleId: circleId.value } }
    }),
  })
}
```

Components import the composable and render based on `{ data, isPending, isError }`. They never call `fetch` directly.

This centralizes cache key management and makes it easy to invalidate related queries after a mutation.

---

## Type checking

The project uses two type checkers in parallel:

- **`vue-tsgo`** (backed by the native TypeScript compiler `tsgo`) — fast incremental checks during development.
- **`vue-tsc`** — slower but fully compatible, used as the authoritative CI check.

Both are run in `pnpm ci:check` via the `typecheck` script, which runs `tsgo` first (fast) and falls back to `tsc` if needed. The `typecheck:tsc` script runs only `tsc` for explicit full compatibility checks.

---

## MSW for development and testing

[MSW (Mock Service Worker)](https://mswjs.io/) intercepts HTTP requests at the network level. It is used in two contexts:

- **Tests** (`src/mocks/`): Vitest mocks use MSW handlers typed against the OpenAPI schema via `openapi-msw`. This ensures mock responses match the actual API contract.
- **Storybook** (`msw-storybook-addon`): Stories can demonstrate loading states, error states, and edge cases without a live backend.

MSW is not used in production builds. The `public/mockServiceWorker.js` file is listed in `.gitignore` equivalents for production.

---

## Storybook

Each reusable component in `src/components/` should have a story. Stories serve two purposes:

1. **Visual regression baseline** — Storybook's Vitest integration runs stories as tests to catch unintended rendering changes.
2. **Living documentation** — designers and other contributors can inspect component variants without running the full stack.

Stories live in `src/stories/` and co-located `*.stories.ts` files.

---

## i18n and locale

The application targets Japanese-speaking users. There is no runtime i18n library. All user-visible strings are written directly in Japanese in the component templates. This is intentional: the overhead of an i18n layer is not justified for a single-locale application, and hard-coded strings are easier to review and grep.

If multi-locale support becomes a requirement, extracting strings into message catalogs is straightforward — but YAGNI applies until then.
