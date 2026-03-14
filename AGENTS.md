# AGENTS.md

## Project Context
- This repository is in a migration phase from Laravel-centric architecture to a split architecture with Vue (frontend) and Go (backend).
- When making implementation decisions, prefer approaches that align with the Vue + Go target architecture while maintaining compatibility during transition.

## Long Task Autonomy
- For long-running or multi-step tasks, do not stop after the first requested subtask is complete.
- After each completed step, autonomously identify and execute the next necessary step until the overall objective is fully resolved, unless the user explicitly asks to pause.