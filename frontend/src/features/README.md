# Features Layer

`src/features` contains feature-specific state, API access, and domain helpers.

## Examples

- `session/`: authenticated user session handling
- `forms/`: participant form APIs and answer helpers
- `staff/forms/`: staff form management APIs and answer workflows
- `auth/api.ts`: authentication-related API and mutations

## Structure

Each feature may contain:

- `api.ts`: API calls and Vue Query hooks
- `store.ts` or similar: Pinia store (if needed)
- feature-scoped helpers and types

## Rule of thumb

If code is owned by one feature area and is not a route component, it belongs here. Vue components are centralized in `src/components/`.
