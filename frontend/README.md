# Frontend Structure

This frontend centralizes **all Vue components** under `src/components`.

```text
frontend/
├── src/
│   ├── app/         # app bootstrap and router wiring (no component implementations)
│   ├── components/  # all Vue components
│   ├── features/    # domain API/state/composables
│   ├── pages/       # route-level pages grouped by area
│   ├── styles/      # global styles
│   ├── stories/     # Storybook stories
│   └── test/        # test setup
├── tests/e2e/       # Playwright tests
└── ...tooling files
```

## Ownership rules

- **`src/components`**: every Vue component (`.vue`) lives here.
- **`src/pages`**: route screens that map directly to URLs.
- **`src/features`**: domain logic only (API, state, business logic, composables).
- **`src/app`**: app bootstrap and router composition only.

## Where to place new code

| What                        | Where                         |
| --------------------------- | ----------------------------- |
| New route page              | `src/pages/<area>/...`        |
| Any Vue component           | `src/components/<domain>/...` |
| Feature API/state logic     | `src/features/<feature>/...`  |
| App bootstrap/router wiring | `src/app/...`                 |
