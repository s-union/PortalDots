# Features Layer

`src/features` contains feature-specific state, API access, and domain helpers.

## Examples

- `session/`: authenticated user session handling
- `forms/`: participant form APIs and answer helpers
- `staff/forms/`: staff form management APIs and answer workflows

## Rule of thumb

If code is owned by one feature area and is not a route component, it belongs here.
