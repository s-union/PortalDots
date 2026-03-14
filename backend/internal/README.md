# Internal Packages

`backend/internal` is split by responsibility so readers can tell whether code is domain logic, infrastructure, presentation, or app wiring.

- `app/`: process-level jobs and workers
- `domain/`: business-facing repositories and services
- `platform/`: config, database bootstrap, and PostgreSQL helpers
- `presentation/`: HTTP handlers and transport concerns
