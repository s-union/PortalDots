# Pages Layer

`src/pages` contains route-level Vue components.

## Directory meaning

- `public/`: pages available without authenticated workspace context
- `workspace/`: participant-facing pages after login or circle selection
- `staff/`: staff-facing pages grouped by feature area

## Rule of thumb

Each file here should correspond to a URL or a closely related route screen. Keep business logic thin—delegate to `src/features` for API/domain logic and `src/components` for UI building blocks.
