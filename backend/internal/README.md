# Internal Packages

`backend/internal` is split by responsibility so readers can quickly map code to common backend concepts.

- `app/`: process-level jobs and workers
- `controllers/`: HTTP handlers, route registration, and API server composition
- `domain/`: business-facing repositories and services
- `middlewares/`: shared Echo middleware and request guards
- `models/`: shared HTTP transport models
- `platform/`: config, database bootstrap, and PostgreSQL helpers
