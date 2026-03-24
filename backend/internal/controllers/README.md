# Controllers Package

`internal/controllers` is the HTTP entrypoint package for the Go backend.

It contains:

- feature handlers (auth, pages, forms, documents, staff APIs)
- route registration (`routes.go`)
- server composition (`server.go`)

Supporting transport concerns are split into sibling packages:

- `internal/middlewares`: Echo middleware setup and session-aware guards
- `internal/models`: shared request/response transport models (validation errors, pagination)

Rule of thumb:

- keep HTTP mapping and endpoint behavior here
- keep business rules in `internal/domain`
- keep infra/runtime wiring in `internal/platform`
