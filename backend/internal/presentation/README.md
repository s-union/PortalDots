# Presentation Layer

`internal/presentation` contains transport-facing code.

Currently `httpapi/` owns Echo handlers, request parsing, and route registration.

Rule of thumb:

- translate HTTP requests into domain calls here
- keep business rules in `internal/domain`
