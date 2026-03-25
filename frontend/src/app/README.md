# App Layer

`src/app` contains application startup wiring.

## What goes here

- `main.ts`: Vue app bootstrap
- `App.vue`: top-level app composition
- `providers/`: app-wide providers such as Pinia and Vue Query
- `router/`: route composition, guards, and route tables
- app-specific types used by startup wiring

## What does not go here

- screen-specific logic belongs in `src/pages`
- feature-specific data access belongs in `src/features`
- Vue components belong in `src/components`
