# Compatibility Matrix

## Guaranteed

- Authentication outcomes and session bootstrap behavior
- Circle selection context
- Staff verification request / confirm / session authorization behavior
- Staff current-circle pages list / create behavior
- Staff current-circle documents list / upload / download behavior
- Staff tags list / create / update / delete behavior
- Staff places list / create / update / delete behavior
- Staff contact categories list / create / update / delete behavior
- Staff current-circle forms list / create / detail behavior
- Staff current-circle forms update behavior
- Staff current-circle form question editor behavior
- Staff current-circle form answer preview by question behavior
- Staff circle list / create / detail / update behavior
- Staff user list / detail / role update behavior
- Staff activity log list behavior
- Workspace access gating by authenticated session and selected circle
- Current-circle pages list and page detail behavior
- Current-circle pages search behavior
- Current-circle documents list, detail, and download behavior
- Current-circle forms list and form detail behavior
- Current-circle question-based form answer create / update / validation behavior
- Current-circle per-question form answer upload / download behavior
- Role-based authorization outcomes
- Search result IDs and ordering
- File access permissions
- CSV and ZIP artifact shapes
- Mail enqueue and delivery semantics

## Intentional Gaps

- Legacy URL structure
- Legacy Blade DOM structure
- GUI installer
- Release information page
- Production MySQL data migration

## Deferred

- Full parity scenario runner implementation
- Golden artifact fixtures
- Legacy/new dual-runtime CI job
