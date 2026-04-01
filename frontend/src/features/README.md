# Features Layer

`src/features` contains feature-specific API access, state, composables, components, and helpers.

## Examples

- `session/`: authenticated user session handling and settings screens
- `forms/`: participant form APIs and answer helpers
- `staff/forms/`: staff form management APIs and answer workflows
- `auth/api.ts`: authentication-related API and mutations

## Structure

Each feature may contain:

- `api.ts`: API calls and Vue Query hooks
- `components/`: feature-owned screens, editors, and content containers
- `composables/`: feature orchestration and local UI state
- `store.ts` or similar: Pinia store (if needed)
- feature-scoped helpers and types

## Rule of thumb

If code is owned by one feature area, it belongs here. Keep reusable primitives in `src/components`, and keep route shells in `src/pages`.
