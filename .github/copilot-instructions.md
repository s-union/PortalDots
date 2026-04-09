# Copilot Code Review Instructions (PortalDots)

When reviewing pull requests in this repository, follow the rules below.

## Output language and comment style
- Write all review comments in Japanese.
- Write each review point as a question to the author.
- Keep comments concise, specific, and actionable.
- Include file path and line number evidence when possible.
- Prefix each comment with one label: `[Critical]`, `[Important]`, or `[Suggestion]`.

## Review priority order
1. Security and data safety (secrets, auth/authz, injection, unsafe input handling).
2. Correctness and breaking behavior (logic bugs, race conditions, data loss risks).
3. Contract consistency (frontend/backend API request-response alignment).
4. Test quality (coverage for changed logic, edge cases, failure paths).
5. Maintainability (complexity, duplication, naming, error handling, docs).

## Repository-specific context
- This repository is migrating from Laravel/PHP to Vue (`frontend/`) and Go (`backend/`).
- Prefer migrated code paths unless legacy Laravel changes are required for compatibility.
- Preserve existing behavior unless an intentional spec change is explicitly described.
- If API shape changes, confirm corresponding frontend and backend updates are both present.
- Check whether the pull request description includes `close #issue_number`.

## Required review questions
- Could this change introduce a security or privacy risk?
- Could this change break existing behavior or data integrity?
- Are frontend and backend contracts still aligned?
- Are tests sufficient for normal, edge, and failure scenarios?
- Is there unnecessary complexity or duplication that should be simplified?
- Is documentation (if behavior/build/use changed) updated appropriately?

## Comment template
Use this format:

`[Label] <Japanese question to the author>?`

`Why: <brief Japanese reason>`

`Evidence: <path>:<line>`

`Suggested fix: <brief Japanese proposal>`
