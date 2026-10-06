# Schema-based form editor

API questions are compiled into a Valibot schema and ordered UI metadata. Formisch owns input, validation, dirty state, and submission state. The renderer selects PortalDots controls from the metadata; Formisch does not generate those controls itself.

## Before and after

| Concern                   | Previous implementation                                  | Current implementation                                                     |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| Input                     | `Record<string, string \| string[]>`                     | `{ text: Record<string, string>, choices: Record<string, string[]> }`      |
| Field bindings            | A union-valued control and runtime narrowing             | Separate string and checkbox controls with typed Formisch paths            |
| Background refresh        | Preserve all input if any field is dirty                 | Preserve dirty fields and accept server changes to clean fields            |
| Successful save           | Preserve all input if anything changed during submission | Preserve only fields that differ from the submitted snapshot               |
| Question structure change | Remount and discard current edits                        | Remount with the latest baseline and compatible dirty values               |
| Answer validation         | Different rules and coverage across pages                | The same compiled schema on all four dynamic-answer screens                |
| Circle detail             | Separate basic-info and answer validation stores         | One schema and Formisch store for basic information and answers            |
| Circle creation           | Manual basic baseline and a pre-validation bridge        | One store for validation, dirty state, and submission of both parts        |
| Registration email        | Reactive input and a custom validation composable        | Direct `useForm` and `Field`, without the grouped editor                   |
| Question authoring        | Replace every editable question after each refresh       | One Formisch store per question ID, retaining dirty fields and raw options |

The API contract remains flat. `answerFormInputToDraft` performs the conversion at the submission boundary and preserves question order for the legacy body summary. Numeric answers remain strings; their schema validates integer bounds.

## Responsibilities

- `answer-form-schema.ts` compiles validation and display metadata, initializes input, and converts it to the API draft.
- `AnswerFormEditor.vue` adapts answer data and API drafts to the shared form lifecycle.
- `SchemaFormEditor.vue` manages schema changes and carries edits between sessions.
- `SchemaFormSession.vue` gives each schema structure its own Formisch lifecycle and exposes the store through a typed slot.
- `useServerSyncedForm.ts` owns server refresh reconciliation, submitted-snapshot acceptance, request ordering, scope invalidation, and validation focus for flat and grouped input.
- `useSchemaForm.ts` preserves the grouped editor's import and type names. It delegates to the shared synchronization lifecycle.
- `useQuestionEditForm.ts` adapts flat question input and saved API values to the same lifecycle, enables autosave, and builds the question preview.
- `SchemaAnswerFields.vue` renders ordered metadata and binds string and checkbox fields to their respective groups.
- `TextAnswerControl.vue`, `CheckboxAnswerControl.vue`, and `UploadAnswerControl.vue` render the controls. Uploads remain separate API operations.
- `WorkspaceFormAnswerForm.vue` supplies the participant-specific header, layout, and actions.
- `circle-detail-form.ts` validates editable basic information and combines it with the answer schema. Participation type is excluded because the detail screen cannot edit it.
- `circle-registration-form.ts` combines all creation fields, including participation type, with the answer schema. `CircleDetailForm.vue` and `CircleRegistrationForm.vue` adapt the two flows to the shared lifecycle; `CircleBasicInfoFields.vue` binds their common fixed fields.

## Synchronization rules

For the same answer, a refresh updates each field's baseline and keeps input only where that field is dirty. Checkbox arrays are treated as complete values. Errors and interaction state are retained for preserved fields.

A successful save compares the current values with the submitted snapshot. Fields unchanged since submission receive the saved values, including server normalization. Later edits are retained against the saved baseline. A result arriving after an answer switch or session disposal does not reset the current editor.

The snapshot is captured before schema transformations. Comparing against raw input lets an unchanged whitespace-padded name accept its normalized saved value. A refresh during validation retries the requested submission with fresh clean fields and the original native submitter, including save-and-continue actions.

The shared lifecycle uses one tagged state instead of independent saving, queued, failed, and disposed flags. The transition function is the only writer. `queued` retains a pending validation or save, or waits for a structural pause to end. A replaced source context invalidates old requests, including an A-to-B-to-A source switch; no revision counter is needed.

| Current state           | Event                         | Next state and behavior                                                 |
| ----------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `idle` / `failed`       | Explicit submission           | `validating`                                                            |
| `validating`            | Refresh interrupts validation | `queued`, retaining the original submission                             |
| `validating` / `saving` | Another autosave request      | `queued`, replacing the queued request with the latest one              |
| `validating` / `queued` | Valid input                   | `saving`, retaining any queued request                                  |
| Active / `queued`       | Submission settles            | `idle`; drain a current queued request, or retain `queued` while paused |
| Active / `queued`       | Save fails                    | `failed`; discard the queued request and require an explicit retry      |
| Any                     | Scope disposal                | Terminal `disposed`; ignore late responses and queued requests          |

`validating` is distinct from `saving` because a field reset interrupts validation but does not end an API request. Manual-submit forms ignore repeated submit events while pending; autosave forms queue the latest request. Those policies share the same reconciliation and stale-response checks.

Only changes to question IDs or value kinds require a new session. Presentation and validation changes update the existing schema. When rebuilding, removed questions are omitted and edits are restored only if their question ID and value kind still match. The snapshot also carries the latest saved baseline, even when refreshed props have not arrived yet.

Structural changes arriving during submission are applied after the request settles. This retains the submitting store, prevents a second submission, and avoids applying a late result to a replacement store.

An editor's source key identifies the answer or circle. Switching that source discards the old input even if the new form reuses question IDs. Circle creation keeps one source scope: changing participation type clears the old answer groups after confirmation and then rebuilds the schema, retaining basic edits. Inherited group names override editable names and become defaults when the new participation type requires them.

The answer adapter's save callback returns `{ answer }` on success, including `{ answer: null }` for forms without questions. Returning `null` indicates failure. Circle creation and detail validate basic information and answers in one pass. There is no pre-validation callback between independent stores. Circle detail advances only when the accepted saved baseline leaves no later edits or pending files.

The shared lifecycle watches the source object's identity, separately from compiled input. Adapters must replace the source when server data changes. Recompiling a schema must not restore stale server props over a newer saved baseline. When a structure changes, the current source supplies new fields; compatible saved baselines and dirty values are carried across for existing fields.

## Question authoring

The staff question editor uses a separate Formisch store for each persisted question ID. `question-edit-schema.ts` validates literal text and boolean fields, transforms raw numeric limits to nullable signed 32-bit integers, and normalizes option text only at submission. It mirrors the backend's required-name, required-option, and numeric-bound rules. `FormQuestionPreviewItem.vue` binds the controls with `Field`; the page owns queries, ordering, and API mutations.

`useQuestionEditForm.ts` accepts refreshed values for clean fields while retaining dirty input and its errors. Raw option text enters the store on input, so a refresh cannot erase an unblurred textarea. A successful save compares against the raw submitted snapshot: unchanged fields accept server normalization, while later edits remain dirty against the saved baseline. Cross-field validation is recomputed after a refresh, without moving focus.

Each question permits one pending save. Further blur or submit events queue the latest input; failures preserve input and require an explicit retry. A refresh that interrupts pending validation retries that requested save. Structural operations wait for question saves; saves requested during creation, deletion, or reordering resume with the refreshed priority. Reordering retains the component and its errors by question ID. Changing form ID creates a new editor scope after the unsaved-input confirmation, and disposed scopes ignore late responses.

A field array would add another ordering authority while the API still persists each question and its order separately. The question editor therefore keeps the server question list and a typed question adapter over the shared synchronization composable. Formisch supplies validation, dirty state, and submission state; synchronization and request ordering remain application policy. This migration fixes a reproduced input-loss bug. It does not add backend version checks for concurrent edits by multiple staff members.

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

Use Formisch directly for fixed forms that do not need server synchronization or changing question sets. Keep the grouped editor for the dynamic-answer and mixed circle screens, where the shared synchronization policy is needed. This supports adoption on these screens; the other fixed forms remain unchanged. The shared lifecycle supports flat fields or two-level groups of strings, string arrays, optional strings, and booleans. Numeric limits use raw strings with schema transformations. Raw numeric or more deeply nested inputs require a separate decision.

The synchronization unification is measured against `8c1f00fe`. Line counts include imports, types, comments, and blank lines, and exclude tests and this documentation:

| Production composables   | Before | After |
| ------------------------ | -----: | ----: |
| `useSchemaForm.ts`       |    172 |     7 |
| `useQuestionEditForm.ts` |    121 |    44 |
| `useServerSyncedForm.ts` |      0 |   296 |
| Total                    |    293 |   347 |

There is now one per-field acceptance implementation and one transition function. Neither the facade nor the shared implementation needs type assertions; the previous grouped implementation already had no unsafe assertions and used one `as const` to preserve a path tuple. The 180-line target is unmet, so this change does not justify expanding Formisch to every form. Keep adoption limited to the current answer, question, and circle flows, plus the existing registration email pilot. Do not count the two thin adapters alone as a code-size reduction.

Dynamic question IDs cannot be enumerated by TypeScript. Static group names and field value kinds are checked. `answer-form-schema.test-d.ts` and `circle-detail-form.test-d.ts` check the field and control contracts as part of the frontend typecheck, including rejection of unknown basic field names and incompatible input types.

`useServerSyncedForm.test-d.ts` also checks that the shared lifecycle returns each caller's precise schema store, preserving literal static paths and value kinds. `useServerSyncedForm.test.ts` runs the same contract suite against flat and grouped layouts: raw submitted snapshots, interrupted validation and native submitters, source changes, failed queued saves, disposal, and optional-string draft restoration. Existing component and page tests continue to cover the rendered controls and adapters.

The renderer and answer synchronization policy remain application code. Formisch provides typed field bindings and field-level validation, dirty, reset, and submission state; it does not eliminate server-to-input synchronization. Its value here is that the application policy is implemented once across four screens, with field-level preservation that the old flat draft did not provide. Keep that boundary rather than adding screen-specific behavior to the editor.

## Checks

```sh
mise run frontend:check
cd frontend && nr test --project=unit
```

Regression coverage includes clean-field refreshes, edits made during a save, server-normalized values, schema migration, late responses, validation focus across both value groups, participation-type switches, URL defaults, inherited names, mixed-form validation, duplicate submissions, and successful saves without an answer. Storybook interaction tests exercise staff editing, circle creation, registration email submission, question autosave races and validation, and save-and-continue in Chromium with mocked API responses.

Frontend checks and unit tests pass. Chromium interactions pass for simultaneous basic and answer validation, focus order, combined circle saves, and direct registration email submission. Targeted Storybook checks still have two accessibility failures that were reproduced before this follow-up:

- The registration-denied warning has a color contrast ratio of 4.18 instead of 4.5. It was reproduced from commit `3da94d87` after waiting for the warning to render.
- The circle detail leader notice has a color contrast ratio of 4.28 instead of 4.5. It was reproduced from commit `2e238680` with the same mixed-form fixture and a successful save that stays on the detail page.

Accessibility checks remain enabled; real-API integration tests are separate from these mocked browser checks.
