# Frontend Structure

This frontend splits Vue code by responsibility:

- `src/pages`: route shells only
- `src/features/*/components`: feature-specific screens, editors, and content containers
- `src/features/*/composables`: feature orchestration and local state
- `src/components`: reusable UI and layout primitives

```text
frontend/
├── src/
│   ├── app/         # app bootstrap and router wiring (no component implementations)
│   ├── components/  # reusable UI/layout primitives
│   ├── features/    # domain APIs, feature components, composables
│   ├── pages/       # route-level shells grouped by area
│   ├── styles/      # global styles
│   ├── stories/     # Storybook stories
│   └── test/        # test setup
├── tests/e2e/       # Playwright tests
└── ...tooling files
```

## Ownership rules

- **`src/components`**: reusable presentational building blocks, not feature-owned data orchestration.
- **`src/pages`**: route shells that map directly to URLs and hand off to feature components.
- **`src/features`**: domain APIs, feature-owned components, composables, and helpers.
- **`src/app`**: app bootstrap and router composition only.

## Where to place new code

| What                         | Where                                   |
| ---------------------------- | --------------------------------------- |
| New route page               | `src/pages/<area>/...`                  |
| Reusable UI/layout component | `src/components/<domain>/...`           |
| Feature screen/editor        | `src/features/<feature>/components/...` |
| Feature API/state/composable | `src/features/<feature>/...`            |
| App bootstrap/router wiring  | `src/app/...`                           |
