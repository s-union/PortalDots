# App Layer

`src/app` contains the application shell and startup code.

## What goes here

- `main.ts`: Vue app bootstrap
- `App.vue`: top-level layout and navigation shell
- `providers/`: app-wide providers such as Pinia and Vue Query
- `router/`: route composition, guards, and route tables

## What does not go here

- screen-specific logic belongs in `src/pages`
- feature-specific data access belongs in `src/features`
- reusable UI and helpers belong in `src/shared`
