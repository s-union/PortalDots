# Pages Layer

`src/pages` contains route-level Vue components.

## Directory meaning

- `public/`: pages available without authenticated workspace context
- `workspace/`: participant-facing pages after login or circle selection
- `staff/`: staff-facing pages grouped by feature area

## Rule of thumb

Each file here should correspond to a URL or a closely related route screen.

Keep route pages thin:

- resolve route params and query state
- wire route metadata
- render a feature-owned content component from `src/features/.../components`

Business logic and feature UI should live under `src/features`, while reusable UI primitives belong in `src/components`.
