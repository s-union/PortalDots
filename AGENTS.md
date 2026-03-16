# AGENTS.md

## Scope
- This repository is in the middle of a migration from Laravel/PHP to a split architecture with a Vue frontend and a Go backend.
- When reading or changing code, treat the legacy Laravel implementation as an existing reference and the `frontend/` + `backend/` directories as the primary destination for new work.
- Prefer extending the new Vue and Go codepaths unless a task explicitly requires changes in the Laravel side for compatibility or rollout reasons.

## Architecture
- `frontend/`: the new frontend built with Vue 3 + Vite + TypeScript.
- `backend/`: the new backend built with Go.
- Legacy Laravel code still exists in the repository, so changes may span both stacks during the migration period.
- Keep migration work incremental and behavior-preserving where possible.

## Implementation Guidance
- For frontend work, follow the existing Vue 3 structure under `frontend/src/` and prefer Composition API patterns.
- For backend work, follow the Go package boundaries described in `backend/README.md`.
- Before introducing a new dependency, confirm that the standard library or existing tooling cannot solve the problem first.
- Avoid broad rewrites across legacy and migrated code unless they are necessary for the task.

## Quality Checks
- Run the relevant checks after changes and before finishing work.
- Whole migrated stack checks:
  - `mise run check`
- Frontend static checks:
  - `mise run frontend-check`
  - `nr ci:check` in `frontend/`
- Frontend tests and build:
  - `nr test` in `frontend/`
  - `nr build` in `frontend/`
- Backend checks and tests:
  - `mise run backend-check`
  - `mise run backend-test`
- Formatting:
  - `mise run format`
  - `mise run frontend-format`
  - `mise run backend-format`

## Change Policy
- Preserve behavior unless the task explicitly requires a spec change.
- Keep frontend and backend contracts aligned; when API shapes change, update both sides together.
- If a feature has both Laravel and migrated implementations, document which side was updated and why.
- Do not commit secrets or environment-specific credentials.

## Git
- Follow Conventional Commits for commit messages.
