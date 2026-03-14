# Platform Layer

`internal/platform` contains infrastructure and runtime wiring.

## Directory meaning

- `config/`: environment loading and validation
- `database/`: dependency construction, migration, and seed wiring
- `postgres/`: generated SQLC code and PostgreSQL helpers

This layer supports the domain and presentation layers but should not own HTTP behavior.
