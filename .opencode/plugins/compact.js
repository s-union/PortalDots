import { readFileSync, existsSync } from "fs"
import { join } from "path"

export const CompactionPlugin = async (ctx) => {
  return {
    "experimental.session.compacting": async (input, output) => {
      const loopDir = join(ctx.directory, ".opencode", "loop")
      const tasksFile = join(loopDir, "tasks.json")
      const progressFile = join(loopDir, "progress.md")

      if (!existsSync(tasksFile)) return

      let tasks
      try {
        tasks = JSON.parse(readFileSync(tasksFile, "utf8"))
      } catch {
        return
      }

      const all = tasks.tasks ?? []
      const done = all.filter((t) => t.status === "done")
      const inProgress = all.filter((t) => t.status === "in_progress")
      const pending = all.filter((t) => t.status === "pending")

      const lines = [
        "## ⚠️ RALPH LOOP ACTIVE — Context was compacted but the loop is still running",
      ]

      if (inProgress.length > 0) {
        lines.push("### Interrupted (treat as pending, redo from scratch)")
        inProgress.forEach((t) => lines.push(`- [ ] [${t.id}] ${t.title}${t.description ? ` — ${t.description}` : ""}`))
        lines.push("")
      }

      if (pending.length > 0) {
        lines.push("### Pending")
        pending.forEach((t) => lines.push(`- [ ] [${t.id}] ${t.title}${t.description ? ` — ${t.description}` : ""}`))
        lines.push("")
      }

      if (done.length > 0) {
        lines.push("### Completed")
        done.forEach((t) => lines.push(`- [x] [${t.id}] ${t.title}`))
        lines.push("")
      }

      if (existsSync(progressFile)) {
        const progress = readFileSync(progressFile, "utf8").trim()
        if (progress) {
          lines.push("### Accumulated knowledge (from progress.md)")
          lines.push(progress)
          lines.push("")
        }
      }

      if (pending.length > 0 || inProgress.length > 0) {
        lines.push("**Action**: Read `.opencode/loop/tasks.json` and resume from the first pending task. Do not wait for user confirmation.")
        lines.push("  - If your tasks is almost done, **find another tasks related to that you worked for.**")
        lines.push("  - User wants to continue the loop without any confirmation. **DO NOT STOP THE SESSION.**")
      } else {
        lines.push("**Action**: All listed tasks are done, but you MUST run the mandatory follow-up checks before reporting completion:")
        lines.push("  1. `git log --oneline -20` — look for gaps (missing tests, broken symmetry)")
        lines.push("  2. `grep -rn 'TODO\\|FIXME\\|HACK\\|XXX' --exclude-dir=.git --exclude-dir=vendor --exclude-dir=node_modules .`")
        lines.push("  3. Run the project's test suite and check for failures")
        lines.push("  If anything is found, append it to `tasks.json` as new pending tasks and continue the loop immediately without informing the user.")
      }

      output.context.push(lines.join("\n"))
    },
  }
}
