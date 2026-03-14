# Compatibility Harness

This directory captures the behavior contract used while Laravel and the new
stack run in parallel.

- `matrix.md` tracks what is guaranteed, intentionally changed, or deferred.
- `fixtures/` stores database-independent scenario fixtures.
- `scenarios/` stores executable scenario definitions for parity checks.

The goal is behavioral compatibility, not HTML or URL parity.
