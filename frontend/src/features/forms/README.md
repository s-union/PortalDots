# Schema-based answer editor

API questions are compiled into a Valibot schema and ordered UI metadata. Formisch owns input, validation, dirty state, and submission state. The renderer selects PortalDots controls from the metadata; Formisch does not generate those controls itself.

## Before and after

| Concern                   | Previous implementation                                  | Current implementation                                                |
| ------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Input                     | `Record<string, string \| string[]>`                     | `{ text: Record<string, string>, choices: Record<string, string[]> }` |
| Field bindings            | A union-valued control and runtime narrowing             | Separate string and checkbox controls with typed Formisch paths       |
| Background refresh        | Preserve all input if any field is dirty                 | Preserve dirty fields and accept server changes to clean fields       |
| Successful save           | Preserve all input if anything changed during submission | Preserve only fields that differ from the submitted snapshot          |
| Question structure change | Remount and discard current edits                        | Remount with the latest baseline and compatible dirty values          |
| Answer validation         | Different rules and coverage across pages                | The same compiled schema on all four dynamic-answer screens           |
| Mixed registration forms  | Separate basic-info and answer draft validation          | One native submit validates both parts and sends one API request      |

The API contract remains flat. `answerFormInputToDraft` performs the conversion at the submission boundary and preserves question order for the legacy body summary. Numeric answers remain strings; their schema validates integer bounds.

## Responsibilities

- `answer-form-schema.ts` compiles validation and display metadata, initializes input, and converts it to the API draft.
- `AnswerFormEditor.vue` manages schema changes and carries edits between sessions.
- `AnswerFormSession.vue` gives each schema structure its own Formisch lifecycle and exposes the store through a typed slot.
- `useAnswerForm.ts` synchronizes answer data, handles submission, and restores validation focus in display order.
- `SchemaAnswerFields.vue` renders ordered metadata and binds string and checkbox fields to their respective groups.
- `TextAnswerControl.vue`, `CheckboxAnswerControl.vue`, and `UploadAnswerControl.vue` render the controls. Uploads remain separate API operations.
- `WorkspaceFormAnswerForm.vue` supplies the participant-specific header, layout, and actions.

## Synchronization rules

For the same answer, a refresh updates each field's baseline and keeps input only where that field is dirty. Checkbox arrays are treated as complete values. Errors and interaction state are retained for preserved fields.

A successful save compares the current values with the submitted snapshot. Fields unchanged since submission receive the saved values, including server normalization. Later edits are retained against the saved baseline. A result arriving after an answer switch or session disposal does not reset the current editor.

Only changes to question IDs or value kinds require a new session. Presentation and validation changes update the existing schema. When rebuilding, removed questions are omitted and edits are restored only if their question ID and value kind still match. The snapshot also carries the latest saved baseline, even when refreshed props have not arrived yet.

Structural changes arriving during submission are applied after the request settles. This retains the submitting store, prevents a second submission, and avoids applying a late result to a replacement store.

An editor's key identifies the answer scope. Switching a staff answer, circle, or participation type creates a fresh editor even if the new form reuses question IDs. Changing a participation type keeps the page's basic information and discards only the old answers after confirmation.

The save callback returns `{ answer }` on success, including `{ answer: null }` for registration forms without questions. Returning `null` indicates failure. `beforeSubmit` lets mixed forms validate basic information before answer validation; `saved` fires after the answer baseline is accepted. The circle detail page advances only when neither part has later edits or pending files.

## Adoption and limits

Adopt the shared editor for dynamic answers. The participant answer screen, staff answer edit screen, circle registration screen, and circle detail screen now use it. The flat draft composables, union-valued control adapter, and compatibility schema have been removed.

The staff pilot met the adoption criteria: it needed no page-specific answer refresh watcher or draft comparison, removed repeated page logic, and demonstrated that an upload refresh preserves edited fields while updating clean fields. The remaining two screens use the same answer lifecycle. Their basic information and dynamic answers still save through one API request; uploads on a new registration remain available only after creation.

The fixed-schema forms still use `useFormValidation`. Circle basic information stays page-owned, including its validation and dirty baseline. On circle detail refreshes, clean basic fields follow the server while edited fields survive; the same submitted-snapshot rule preserves basic edits made during a save. This decision does not establish an application-wide migration.

Dynamic question IDs cannot be enumerated by TypeScript. Static group names and field value kinds are checked. `answer-form-schema.test-d.ts` checks the field and control contracts as part of the frontend typecheck.

The renderer and answer synchronization policy remain application code. Formisch provides typed field bindings and field-level validation, dirty, reset, and submission state; it does not eliminate server-to-input synchronization. Its value here is that the application policy is implemented once across four screens, with field-level preservation that the old flat draft did not provide. Keep that boundary rather than adding screen-specific behavior to the editor.

## Checks

```sh
mise run frontend:check
cd frontend && nr test --project=unit
```

Regression coverage includes clean-field refreshes, edits made during a save, server-normalized values, schema migration, late responses, validation focus across both value groups, participation-type switches, mixed-form validation, and successful saves without an answer. Storybook interaction tests exercise staff editing, registration creation, and save-and-continue in Chromium with mocked API responses.

The targeted Storybook run has one existing accessibility failure: the registration-denied warning has a color contrast ratio of 4.18 instead of 4.5. The same failure was reproduced from commit `3da94d87` after waiting for the warning to render. Accessibility checks remain enabled; real-API integration tests are separate from these mocked browser checks.
