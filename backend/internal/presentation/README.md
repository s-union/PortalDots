# Presentation Layer

`internal/presentation` contains transport-facing code.

`httpapi/` is organized by HTTP-layer responsibility:

- `controllers/`: route registration and endpoint wiring
- `middlewares/`: Echo middleware setup
- `models/`: shared request/response transport models
- root `httpapi` package: feature handlers and server composition

Rule of thumb:

- translate HTTP requests into domain calls here
- keep business rules in `internal/domain`
