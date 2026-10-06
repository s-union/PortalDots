# Schema-based form editor

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
| Circle detail             | Separate basic-info and answer validation stores         | One schema and Formisch store for basic information and answers       |
| Circle creation           | Manual basic baseline and a pre-validation bridge        | One store for validation, dirty state, and submission of both parts   |
| Registration email        | Reactive input and a custom validation composable        | Direct `useForm` and `Field`, without the grouped editor              |

The API contract remains flat. `answerFormInputToDraft` performs the conversion at the submission boundary and preserves question order for the legacy body summary. Numeric answers remain strings; their schema validates integer bounds.

## Responsibilities

- `answer-form-schema.ts` compiles validation and display metadata, initializes input, and converts it to the API draft.
- `AnswerFormEditor.vue` adapts answer data and API drafts to the shared form lifecycle.
- `SchemaFormEditor.vue` manages schema changes and carries edits between sessions.
- `SchemaFormSession.vue` gives each schema structure its own Formisch lifecycle and exposes the store through a typed slot.
- `useSchemaForm.ts` synchronizes grouped input, handles submission, and restores validation focus in display order.
- `SchemaAnswerFields.vue` renders ordered metadata and binds string and checkbox fields to their respective groups.
- `TextAnswerControl.vue`, `CheckboxAnswerControl.vue`, and `UploadAnswerControl.vue` render the controls. Uploads remain separate API operations.
- `WorkspaceFormAnswerForm.vue` supplies the participant-specific header, layout, and actions.
- `circle-detail-form.ts` validates editable basic information and combines it with the answer schema. Participation type is excluded because the detail screen cannot edit it.
- `circle-registration-form.ts` combines all creation fields, including participation type, with the answer schema. `CircleDetailForm.vue` and `CircleRegistrationForm.vue` adapt the two flows to the shared lifecycle; `CircleBasicInfoFields.vue` binds their common fixed fields.

## Synchronization rules

For the same answer, a refresh updates each field's baseline and keeps input only where that field is dirty. Checkbox arrays are treated as complete values. Errors and interaction state are retained for preserved fields.

A successful save compares the current values with the submitted snapshot. Fields unchanged since submission receive the saved values, including server normalization. Later edits are retained against the saved baseline. A result arriving after an answer switch or session disposal does not reset the current editor.

Only changes to question IDs or value kinds require a new session. Presentation and validation changes update the existing schema. When rebuilding, removed questions are omitted and edits are restored only if their question ID and value kind still match. The snapshot also carries the latest saved baseline, even when refreshed props have not arrived yet.

Structural changes arriving during submission are applied after the request settles. This retains the submitting store, prevents a second submission, and avoids applying a late result to a replacement store.

An editor's source key identifies the answer or circle. Switching that source discards the old input even if the new form reuses question IDs. Circle creation keeps one source scope: changing participation type clears the old answer groups after confirmation and then rebuilds the schema, retaining basic edits. Inherited group names override editable names and become defaults when the new participation type requires them.

The answer adapter's save callback returns `{ answer }` on success, including `{ answer: null }` for forms without questions. Returning `null` indicates failure. Circle creation and detail validate basic information and answers in one pass. There is no pre-validation callback between independent stores. Circle detail advances only when the accepted saved baseline leaves no later edits or pending files.

The shared lifecycle watches the source object's identity, separately from compiled input. Adapters must replace the source when server data changes. Recompiling a schema must not restore stale server props over a newer saved baseline. When a structure changes, the current source supplies new fields; compatible saved baselines and dirty values are carried across for existing fields.

## Adoption and limits

Adopt the shared editor for dynamic answers. The participant answer screen, staff answer edit screen, circle registration screen, and circle detail screen now use it. The flat draft composables, union-valued control adapter, and compatibility schema have been removed.

The staff pilot met the adoption criteria: it needed no page-specific answer refresh watcher or draft comparison, removed repeated page logic, and demonstrated that an upload refresh preserves edited fields while updating clean fields. The remaining two screens use the same answer lifecycle. Their basic information and dynamic answers still save through one API request; uploads on a new registration remain available only after creation.

Circle detail is also a fixed-schema pilot. Its basic information and dynamic answers share `{ basic, text, choices }`, one validation pass, one dirty baseline, and one submitting state. The page no longer owns `useFormValidation`, `formBaseline`, `syncBasicInfo`, manual field comparisons, or a validation bridge. Its API request remains combined. Clean-field refresh and submitted-snapshot preservation now use the same policy for both parts.

| Circle detail concern  | Before this pilot                                     | With this pilot                                                      |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| Validation             | Basic validation runs before answer validation        | One pass reports both groups and focuses the first visible error     |
| Dirty state            | Six basic-field comparisons plus answer dirty state   | One Formisch dirty state plus pending files                          |
| Server synchronization | Page-specific basic sync plus shared answer sync      | Shared field reset policy for all three groups                       |
| Types                  | Fixed names only in page state; separate answer store | Literal basic field paths and string/array answer paths in one store |

The first mixed-form pilot, committed as `f81e017e`, reduced the circle detail page from 436 to 291 lines compared with `2e238680`. Including its shared lifecycle and typed adapters, production code grew by 103 lines; tests, stories, and documentation are excluded. These are measurements of that commit. The benefit is a single state and synchronization policy for basic information and answers, rather than a demonstrated net code-size reduction.

Circle creation now uses the same `{ basic, text, choices }` store. Its manual baseline, field comparisons, and `useFormValidation` have been removed. URL-selected participation types and inherited names are initial values; user selection changes and edits trigger the existing exit guard. Type changes still confirm only when discarding answers, including reused question IDs. Validation remains immediate on input in this screen.

The registration email screen is a separate fixed-form pilot. It calls `useForm` directly, binds its single field with `Field`, and uses Formisch's submitting state to block duplicate requests. It needs neither schema migration nor server-refresh reconciliation. Required-field validation and focus, successful submission, and preserving input for a retry are covered without the shared editor.

Use Formisch directly for fixed forms that do not need server synchronization or changing question sets. Keep the grouped editor for the dynamic-answer and mixed circle screens, where the shared synchronization policy is needed. This supports adoption on these screens; the other fixed forms remain unchanged. The grouped lifecycle supports two-level groups of strings, string arrays, and optional strings. Numeric or more deeply nested inputs require a separate decision.

Dynamic question IDs cannot be enumerated by TypeScript. Static group names and field value kinds are checked. `answer-form-schema.test-d.ts` and `circle-detail-form.test-d.ts` check the field and control contracts as part of the frontend typecheck, including rejection of unknown basic field names and incompatible input types.

The renderer and answer synchronization policy remain application code. Formisch provides typed field bindings and field-level validation, dirty, reset, and submission state; it does not eliminate server-to-input synchronization. Its value here is that the application policy is implemented once across four screens, with field-level preservation that the old flat draft did not provide. Keep that boundary rather than adding screen-specific behavior to the editor.

## Checks

```sh
mise run frontend:check
cd frontend && nr test --project=unit
```

Regression coverage includes clean-field refreshes, edits made during a save, server-normalized values, schema migration, late responses, validation focus across both value groups, participation-type switches, URL defaults, inherited names, mixed-form validation, duplicate submissions, and successful saves without an answer. Storybook interaction tests exercise staff editing, circle creation, registration email submission, and save-and-continue in Chromium with mocked API responses.

Frontend checks and all 716 unit tests pass. Chromium interactions pass for simultaneous basic and answer validation, focus order, combined circle saves, and direct registration email submission. Targeted Storybook checks still have two accessibility failures that were reproduced before this follow-up:

- The registration-denied warning has a color contrast ratio of 4.18 instead of 4.5. It was reproduced from commit `3da94d87` after waiting for the warning to render.
- The circle detail leader notice has a color contrast ratio of 4.28 instead of 4.5. It was reproduced from commit `2e238680` with the same mixed-form fixture and a successful save that stays on the detail page.

Accessibility checks remain enabled; real-API integration tests are separate from these mocked browser checks.
