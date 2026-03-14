# Frontend Structure

Vue 3 + Vite frontends are easier to read when route pages, feature logic, and shared UI are separated.

```text
frontend/
├── src/
│   ├── app/        # entrypoint, providers, router
│   ├── pages/      # route-level pages grouped by area
│   ├── features/   # domain-specific API and state logic
│   ├── shared/     # reusable UI and utility code
│   ├── styles/     # global styles
│   ├── stories/    # Storybook stories
│   └── test/       # test setup
├── tests/e2e/      # Playwright tests
└── ...tooling files
```

Rules of thumb:

- `src/app`: things the whole app needs once, such as `main.ts`, Pinia, Vue Query, and the router.
- `src/pages`: components that map directly to URLs like `/workspace/forms` or `/staff/users/:userId`.
- `src/features`: logic owned by a feature, such as `features/staff/forms/api.ts`.
- `src/shared`: code reused across multiple features, such as UI primitives and API helpers.
- `src/styles`, `src/stories`, `src/test`: keep support code out of feature folders.
