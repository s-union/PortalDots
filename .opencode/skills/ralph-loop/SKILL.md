---
name: ralph-loop
description: File-based task loop that runs the agent autonomously through a task list until all tasks are complete. Survives context compaction by persisting state to files and re-injecting it automatically via the compaction plugin. Use when the user wants to work through multiple tasks without stopping, when the workload is too large for a single context window, or when asked to "keep going", "do everything", "don't stop", or "loop until done".
---

# Ralph Loop

Run through a task list autonomously. State is stored in files so the loop survives context compaction.

## Starting a Loop

When given a task list, create these two files **before any work begins**:

**`.opencode/loop/tasks.json`**
```json
{
  "startedAt": "2026-03-16T09:00:00Z",
  "description": "Overall goal",
  "tasks": [
    { "id": "1", "title": "Task title", "description": "Optional details", "status": "pending" }
  ]
}
```

**`.opencode/loop/progress.md`**
```markdown
# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->
```

## Iteration Workflow

Repeat for each task until all are `done`:

1. **Read** `.opencode/loop/tasks.json` — find the first `pending` task
2. **Read** `.opencode/loop/progress.md` — review past discoveries and pitfalls
3. **Set** the task status to `in_progress` in `tasks.json`
4. **Do** the work
5. **Set** the task status to `done` with `completedAt` timestamp
6. **Append** important patterns or pitfalls to `progress.md`
7. **Commit** with `git commit` (conventional commits)
8. **Repeat immediately** — no user confirmation needed between tasks

## Finishing

When all tasks are `done`:
1. Add `"completedAt"` to the root of `tasks.json`
2. **MANDATORY follow-up checks — run ALL of these before any completion report:**
   - `git log --oneline -20` — review recent commits for obvious gaps (missing tests, missing error handling, broken symmetry)
   - `grep -rn "TODO\|FIXME\|HACK\|XXX" --exclude-dir=.git --exclude-dir=vendor --exclude-dir=node_modules .` — find actionable TODOs introduced during the loop
   - Run the project's test suite and check for failures (infer the test runner from project config files present in the repo)
   - Search for callers of changed symbols that may need updating, using file extensions appropriate for the project's language(s)
   - Look for sibling files/modules that should receive the same treatment as files already changed
3. If **any** follow-up work is found: **append as new `pending` tasks** with `"addedAt"` timestamp and **continue the loop immediately without telling the user**
4. Only when all checks return nothing actionable: report a completion summary to the user
5. Ask whether to delete `.opencode/loop/`

## Resuming After Context Compaction

The compaction plugin (`.opencode/plugins/compact.js`) automatically re-injects current task state and progress notes when context is compacted. After any compaction:

1. Read `tasks.json` to locate the current position
2. Read `progress.md` for accumulated knowledge
3. If a task is `in_progress`, treat it as `pending` and redo it (assume it was interrupted)
4. Continue from the first `pending` task

## Rules

- **Files are truth** — read files every iteration; never rely on context memory
- **Don't stop** — if an error occurs, log it in `progress.md` and move to the next task
- **Find your own next task** — when the task list runs out, you MUST run the mandatory follow-up checks in the Finishing section before stopping. Finding even one gap means appending tasks and continuing immediately
- **Commit per task** — one `git commit` minimum per completed task
- **No confirmations** — proceed through the task list autonomously unless blocked by a decision only the user can make
