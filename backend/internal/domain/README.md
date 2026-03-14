# Domain Layer

`internal/domain` contains business-facing packages grouped by feature.

Examples include `form`, `page`, `session`, and `useradmin`.

Rule of thumb:

- keep business interfaces and feature logic here
- avoid HTTP-specific concerns here
- avoid process bootstrap concerns here
