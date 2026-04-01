# Shared Layer

This project no longer keeps reusable Vue components in `src/shared`.

- Reusable UI/layout primitives live in `src/components/`.
- Feature-owned components live in `src/features/<feature>/components/`.
- Shared non-component utilities should live under domain-appropriate modules (for example `src/lib` or `src/features`).

`src/shared/README.md` is kept temporarily as migration guidance.
