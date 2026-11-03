# Form lifecycle and schema-based editor

API questions are compiled into a Valibot schema and ordered UI metadata. Formisch owns input, validation, dirty state, and submission state. The renderer selects PortalDots controls from the metadata; Formisch does not generate those controls itself.

## Before and after

| Concern                   | Previous implementation                                            | Current implementation                                                     |
| ------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Input                     | `Record<string, string \| string[]>`                               | `{ text: Record<string, string>, choices: Record<string, string[]> }`      |
| Field bindings            | A union-valued control and runtime narrowing                       | Separate string and checkbox controls with typed Formisch paths            |
| Background refresh        | Preserve all input if any field is dirty                           | Preserve dirty fields and accept server changes to clean fields            |
| Successful save           | Preserve all input if anything changed during submission           | Preserve only fields that differ from the submitted snapshot               |
| Question structure change | Remount and discard current edits                                  | Remount with the latest baseline and compatible dirty values               |
| Answer validation         | Different rules and coverage across pages                          | The same compiled schema on all four dynamic-answer screens                |
| Circle detail             | Separate basic-info and answer validation stores                   | One schema and Formisch store for basic information and answers            |
| Circle creation           | Manual basic baseline and a pre-validation bridge                  | One store for validation, dirty state, and submission of both parts        |
| Fixed forms               | Separate touched, debounce, validation and submission coordination | Schema-typed Formisch stores and shared native-control bindings            |
| Question authoring        | Replace every editable question after each refresh                 | One Formisch store per question ID, retaining dirty fields and raw options |

The API contract remains flat. `answerFormInputToDraft` performs the conversion at the submission boundary and preserves question order for the legacy body summary. Numeric answers remain strings; their schema validates integer bounds.

Text and numeric validation examines trimmed input, matching the server's required-field and character-count rules while preserving raw drafts. Select, radio, and checkbox validation rejects values removed from a nonempty option list. Definition refreshes retain those selections visibly so users can correct them; checkbox users can remove obsolete selections. Radio and checkbox groups use fieldsets and legends, and each input references its description and error. Inherited, locked circle group names bypass editable-name validation, matching the backend's permission-dependent validation.

## Schema-generated form UI

`src/features/forms/schema-form/` renders pages' controls directly from a Valibot schema instead of each page hand-writing its own field markup. `fieldUi()` (`ui.ts`) attaches per-field UI metadata — control kind, label, helper, placeholder, options, and similar static properties — to a field's own schema via `v.pipe(innerSchema, ..., fieldUi({ control: 'text', label: '名前', ... }))`. `formLayout()` (`layout.ts`) attaches the ordered arrangement of those fields to the enclosing object schema. `SchemaFormFields.vue` reads both and renders each item through `SchemaFormField.vue` (one field: `FormischField` plus label/required wiring) and `SchemaFieldControl.vue` (the actual `<input>`/`<select>`/picker for that field's `control` kind).

Reusable, cross-form validation primitives in `src/lib/form-validation/schemas.ts` (e.g. `fullNameSchema`, `nameYomiSchema`, `phoneNumberSchema`, `passwordSchema`) stay UI-free: they express only the validation rule, with no `fieldUi()` attached. Each concrete form schema wraps the shared primitive with its own `fieldUi()` at the point of use (`v.pipe(fullNameSchema, fieldUi({ control: 'text', label: '名前', ... }))`), so the same rule can carry a different label, control kind, or placeholder per form without duplicating the validation itself.

A layout (`LayoutItem[]`) is an ordered list of:

- a plain field key (`string`, or `{ field, testId }` to keep an existing `data-testid` hook),
- `{ row: [...], label?, caption?, testId? }` — fields placed side by side; a `row` entry can also be a `{ display, label }` read-only item (see below),
- `{ section, description?, collapsible?, items }` — a (optionally `<details>`-collapsible) group that recurses into its own `items`,
- `{ slot }` — renders the named slot `slot:<name>`, for non-field content interleaved with fields (e.g. an upload control),
- `{ heading, description? }` — a static heading not tied to any field, and
- `{ display, label }` — a read-only row whose value comes from `SchemaFormFields`' `displayValues` prop (and whose label can be overridden at runtime via `displayLabels`), for server-supplied values shown alongside editable fields.

`resolveLayout()` falls back to one row per schema entry, in object-entry order, when the schema carries no `formLayout()` metadata.

`isRequiredField()` (`required.ts`) is the single source of requiredness: it derives whether a field is required from its own schema's validations (a string/array requiring at least one character/item, a present number, a boolean that must be `true`), and that same boolean drives both the label's required marker and the control's native `required`/`aria-required`. An explicit `fieldUi({ required: ... })` overrides the derivation in either direction, for the rare case the schema shape can't express it.

`FieldOverride` (`types.ts`) carries runtime-only values a schema can't express at definition time: `hidden`, `disabled`, `readonly`, `label`/`helper`/`placeholder`/`suffix`/`prefix` overrides, `options` loaded from a query, tag/user-picker data, and loading/empty messages. Everything else — control kind, static label text, helper text, and the validation itself — lives in the schema's `fieldUi()` metadata, not in a per-render override.

`before:<key>`/`after:<key>` slots wrap a specific field with extra content without replacing its control. `SchemaFormFields` also defines a `field:<key>` slot that replaces a field's control entirely; it still exists in `SchemaFormFields.vue`/`SchemaFormField.vue` as an escape hatch, but no migrated page currently uses it — `overrides` and `layout` cover every current per-field need, and pages must not hand-write per-field markup when they do.

The `'settings'` layout variant renders each row's label and caption itself in a left column, and passes `hide-label` (plus `aria-labelledby` for fieldset controls) down to `SchemaFormField`/`FormischField`/`FormField` so there is exactly one accessible label per field — the left-column text — instead of that text and the field's own label both rendering.

Dynamic answers and the question editor reuse the same renderer instead of per-control-kind components: `SchemaAnswerFields.vue` wraps `SchemaFormFields` with `variant="list"` and a `slot:upload:<id>` layout item for `UploadAnswerControl.vue` (kept separate because uploads remain separate API operations); `FormQuestionPreviewItem.vue` passes the staff question-edit schema straight to `SchemaFormFields` with no variant override.

### Intentional visible changes

Deriving requiredness and labels from the schema changed some pages' rendered output, intentionally:

- A schema-derived required marker now appears on fields whose schema already enforced a required rule (e.g. `v.minLength(1, ...)`) but whose hand-written markup previously showed no marker.
- `'settings'`-variant rows no longer duplicate the caption title and the field's own label; the left column's label is now the field's single accessible label (see above).
- The staff form create page's `isPublic` checkbox now renders inside a `<fieldset>`/`<legend>`, because `'checkbox'` is one of `isFieldsetControl()`'s fieldset-rendering control kinds.
- Accessible names of migrated answer controls now include the required marker as part of the rendered label text; a separate `aria-label` duplicating that name has been removed.

## Responsibilities

- `schema-form/` (`fieldUi()`/`ui.ts`, `formLayout()`/`layout.ts`, `isRequiredField()`/`required.ts`, `SchemaFormFields.vue`, `SchemaFormField.vue`, `SchemaFieldControl.vue`) attaches UI and layout metadata to Valibot schemas and renders every fixed-form, dynamic-answer, and question-editor control from it; see "Schema-generated form UI" above.
- `answer-form-schema.ts` compiles validation and display metadata, initializes input, and converts it to the API draft.
- `AnswerFormEditor.vue` adapts answer data and API drafts to the shared form lifecycle.
- `SchemaFormEditor.vue` manages schema changes and carries edits between sessions.
- `SchemaFormSession.vue` gives each schema structure its own Formisch lifecycle and exposes the store through a typed slot.
- `useSubmitForm.ts` coordinates fixed-form submission, duplicate guards, success messages and API errors using Formisch state.
- `FormischField.vue` binds schema-typed fields to native registration, associated labels, errors and descriptions without a second validation store. It also supports `hide-label` (with an `aria-labelledby` fallback for fieldset controls), for layouts — like the `'settings'` variant above — that render their own external label, and suppresses error presentation (no `border-danger`, `aria-invalid`, or described-by error) while a field is `disabled`, matching hand-written pages that hid errors on fields that couldn't be edited. `DateTimeInput.vue` adapts the existing timestamp conversion.
- `form-errors.ts` attaches field errors only when current raw input still matches the submitted snapshot, and focuses registered controls in display order.
- `useServerSyncedForm.ts` owns server refresh reconciliation, submitted-snapshot acceptance, request ordering, scope invalidation, and validation focus for flat and grouped input.
- `server-synced-form-fields.ts` owns schema-derived leaf paths, flat/grouped field enumeration, raw value comparison, and compatible snapshot values.
- `server-synced-form-state.ts` owns the submission state and transitions. State and request metadata are readonly; callers change the state through `transition`.
- `useSchemaForm.ts` preserves the grouped editor's import and type names. It delegates to the shared synchronization lifecycle.
- `useQuestionEditForm.ts` adapts flat question input and saved API values to the same lifecycle, enables autosave, and builds the question preview.
- `SchemaAnswerFields.vue` wraps `SchemaFormFields` (`variant: 'list'`) to render ordered metadata, forwarding a `slot:upload:<id>` layout item to `UploadAnswerControl.vue`. Uploads remain separate API operations; every other answer control renders through `SchemaFieldControl.vue`. `TextAnswerControl.vue`, `CheckboxAnswerControl.vue`, and their `AnswerControls.test.ts` have been removed; `SchemaFormFields.test.ts` covers that rendering through `SchemaFieldControl.vue` instead.
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
| Waiting `queued`        | Pause ends                    | `validating` with fresh input and the latest queued submitter           |
| `validating`            | Refresh interrupts validation | `queued`, retaining the original submission                             |
| `validating` / `saving` | Another autosave request      | `queued`, replacing the queued request with the latest one              |
| `validating` / `queued` | Valid input                   | `saving`, retaining any queued request                                  |
| Active / `queued`       | Submission settles            | `idle`; drain a current queued request, or retain `queued` while paused |
| Active / `queued`       | Save fails                    | `failed`; discard the queued request and require an explicit retry      |
| Any                     | Scope disposal                | Terminal `disposed`; ignore late responses and queued requests          |

`validating` is distinct from `saving` because a field reset interrupts validation but does not end an API request. Manual-submit forms ignore repeated submit events while pending; autosave forms queue the latest request. Those policies share the same reconciliation and stale-response checks.

One iterative loop drains queued submissions; `submitEvent` does not recursively call itself. Eligibility checks share `isCurrent`, which rejects disposed scopes and replaced source contexts. Each iteration captures fresh raw input and schema, and retains the latest requested native submitter. A pause that begins during a save retains the queued request until the pause ends.

Validation focus follows the supplied display order using Formisch's error entries. It also handles optional fields that were absent from initial input. It needs neither a length-based type-narrowing branch nor a lookup limited to baseline fields.

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

Fixed forms use `useSubmitForm` when they only submit, or `useServerSyncedForm` when background refreshes must preserve edits. Profile, staff settings, participation types, notices and master editors reuse the existing synchronization lifecycle. Contact, password changes, new staff forms, new participation types, new notices and account completion use the smaller submit-only helper. Registration email remains a direct single-field Formisch caller. The dynamic-answer and mixed circle screens continue to use the grouped editor.

All eleven former production callers of `useFormValidation` have migrated; its implementation and tests have been removed. The contact-category editor also replaces its always-valid custom callback with schema-bound fields. Its email schema trims and requires a value; email syntax remains server-validated because the server uses Go's `mail.ParseAddress`, whose accepted addresses differ from Valibot's email rule. No new dependency or API contract is required.

`FormischField` supplies native `ref` and interaction handlers, plus application-written labels and ARIA. Custom markdown, checkbox, tag and user controls register their native inputs. A serialized `data-field-path` identifies an already-focused control even when its visible name differs from its schema path. Disabled and unmounted invalid controls are skipped. Static field names and input/output types are checked by the schema, including number fields and string arrays; typecheck regressions reject misspelled paths and incompatible values. Uploads remain separate operations and participate in the existing unsaved-input guard.

The synchronization lifecycle supports flat fields or two-level groups of strings, string arrays, optional strings, booleans and numbers. Dynamic numeric answers and question limits still use raw strings with schema transformations. On refresh, dirty fields retain input while clean fields accept the server baseline. After a save, only fields that are still dirty and differ from the raw submitted snapshot retain input. This additional dirty check prevents a clean field updated by a refresh during saving from being mistaken for a later user edit. Source changes and disposed sessions ignore late save results; master editors also clear selection-specific messages and ignore late delete results from another selection.

### Current usefulness assessment

Formisch is useful in this application: one schema-typed field-state model now replaces the old touched/debounce validation implementation, and the existing synchronization policy serves the fixed editors as well as the dynamic editors. The benefit is supported by actual component behavior and removal of duplicate state management, rather than the library name alone.

`form-lifecycle-contract.test.ts` mounts thirteen actual forms with native DOM controls and MSW requests. Twenty-six cases cover initial error visibility, invalid-request blocking and focus, duplicate submission, field-specific 422 errors with associated ARIA, corrected retry and reset/navigation. Within that contract file, five additional cases cover clean-field refreshes and edits during saving in three staff editors, profile refresh and password clearing, and a blank numeric draft plus typed numeric/tag-array submission. Shared flat/grouped lifecycle tests cover request ordering, source changes, interrupted validation and disposal. Master tests cover dirty text with clean colour refresh, clearing messages on selection changes, and ignoring a late deletion failure. Browser interactions cover native controls and markdown server-error focus and correction.

Production size is measured after the repository formatter, against `aa5424ba79f6bd73b8a4ae5f03e865e2c34e28f5`. The count includes every changed/new `.ts` and `.vue` production file, including extracted helpers, imports, comments and blank lines. Tests (including `.test-d.ts`), stories, declarations and documentation are excluded. UTF-8 byte counts provide a second measure that is less sensitive to line wrapping.

| Measure                                      |  Before | Current |     Difference |
| -------------------------------------------- | ------: | ------: | -------------: |
| Changed/new production files, combined lines |   6,309 |   5,950 |   −359 (−5.7%) |
| Same production files, UTF-8 bytes           | 219,714 | 213,396 | −6,318 (−2.9%) |

The new shared field, control type, date adapter, submit helper and error helper contribute 185 lines and are included above. The old validation implementation contributed 226 lines and is removed. The totals include the accompanying accessibility, schema and synchronization fixes; they do not isolate a library-only size effect. Adding shared code did not merely move page lines out of the count.

Formisch supplies input, validation, dirty, touched, reset and submission state. Duplicate guards and ARIA bindings remain application code using that state. Valibot owns validation rules and normalization, and PortalDots owns refresh reconciliation, request ordering, permissions, attachments and navigation. The tested behavior could also be implemented manually, as the contact control below demonstrates. This assessment does not establish runtime performance, reduced future maintenance effort, or superiority over other form libraries.

### Contact-only control comparison (historical)

A temporary nine-case comparison mounted the contact page from `aa5424ba`, a minimally repaired version of that page, and the current page with the same API mocks and current shared validation schema. Keeping that schema constant separates the contact state changes from the new validation rules. The comparison observed:

| Scenario                                | Before Formisch | Manual repair       | Current contact form |
| --------------------------------------- | --------------- | ------------------- | -------------------- |
| API calls from two simultaneous submits | 2               | 1                   | 1                    |
| Required errors 400 ms after success    | Present         | Absent              | Absent               |
| Focus on the first invalid field        | Unchanged       | Moved to that field | Moved to that field  |

Formisch supplies the validation-to-submission state used by the application-written duplicate guard, resets interaction state together with values, and focuses invalid registered fields. The manual repair added 16 lines: a submission flag with `finally`, clearing touched state and errors before resetting values, and element references for invalid-field focus. It passed the same three scenarios, demonstrating that Formisch is not necessary for those fixes. That control did not implement the current form's field-specific 422 handling or ARIA markup, and the comparison does not establish equivalent behavior beyond the tested scenarios. The temporary comparison fixtures were removed; `contact.test.ts` retains regression coverage for the current behavior.

In that initial contact-only iteration, production code grew from 198 to 253 lines across the page, component and composable while the old validation approach still existed elsewhere. That limited comparison justified lifecycle correctness, but did not establish net code reduction. The subsequent migration and current whole-change measurement above replace that earlier adoption limit; the 253-line figure is historical, not the current contact size.

### Historical synchronization measurements

The synchronization unification at `bacb0de9` and the subsequent responsibility split are measured against `8c1f00fe`. Line counts include imports, types, comments, and blank lines, and exclude tests and this documentation. Extracted production helpers remain included in the total:

| Production module              | Before unification | Unified (`bacb0de9`) | After split |
| ------------------------------ | -----------------: | -------------------: | ----------: |
| `useSchemaForm.ts`             |                172 |                    7 |           8 |
| `useQuestionEditForm.ts`       |                121 |                   44 |          44 |
| `useServerSyncedForm.ts`       |                  0 |                  296 |         223 |
| `server-synced-form-fields.ts` |                  0 |                    0 |          46 |
| `server-synced-form-state.ts`  |                  0 |                    0 |          77 |
| Total                          |                293 |                  347 |         398 |

That iteration produced one per-field acceptance implementation and one transition function, but did not meet its 180-line target or demonstrate a total size reduction. Neither the facade nor the shared implementation needed type assertions. These are historical measurements; the current migration reuses that existing lifecycle only where refresh reconciliation is needed and includes all new helpers in its totals.

The split makes state ownership and path operations independently readable, and replaces recursive draining with an explicit loop. It does not reduce total production code. The registration email screen remains a direct Formisch user. Circle creation includes participation-type changes and dynamic answers, so it continues to use the shared editor rather than a simple fixed-form wrapper.

Dynamic question IDs cannot be enumerated by TypeScript. Static group names and field value kinds are checked. `answer-form-schema.test-d.ts` and `circle-detail-form.test-d.ts` check the field and control contracts as part of the frontend typecheck, including rejection of unknown basic field names and incompatible input types.

`SyncedFieldPath<TSchema>` derives literal leaf paths from raw schema input. `focusOrder` uses that type throughout the generic editor and session components; `NoInfer` prevents an invalid focus path from widening the schema. Runtime question IDs remain dynamic strings. The internal value union includes booleans and numbers for fixed settings and question authoring; the public store still checks each field against its own schema type.

`useServerSyncedForm.test-d.ts` checks that the shared lifecycle returns each caller's precise schema store, and rejects misspelled focus groups and fixed field names. `useServerSyncedForm.test.ts` runs the same contract suite against flat and grouped layouts: raw submitted snapshots, interrupted validation and native submitters, source changes, failed queued saves, consecutive queued saves, pauses during saving, disposal, optional-string draft restoration, and display-order focus for optional fields absent from initial input. Existing component and page tests continue to cover the rendered controls and adapters.

The renderer and answer synchronization policy remain application code. Formisch provides typed field bindings and field-level validation, dirty, reset, and submission state; it does not eliminate server-to-input synchronization. Its value here is that the application policy is implemented once across four screens, with field-level preservation that the old flat draft did not provide. Keep that boundary rather than adding screen-specific behavior to the editor.

## Checks

```sh
mise run frontend:check
cd frontend && nr test --project=unit
```

Regression coverage includes clean-field refreshes, edits made during a save, server-normalized values, schema migration, late responses, validation focus across both value groups, participation-type switches, URL defaults, inherited names, mixed-form validation, duplicate submissions, and successful saves without an answer. Storybook interaction tests exercise staff editing, circle creation, registration email submission, question autosave races and validation, and save-and-continue in Chromium with mocked API responses.

The current fixed-form follow-up passes typecheck, lint without diagnostics, formatter check, and all 797 unit tests across 140 files. Fourteen targeted Storybook files pass 34 Chromium cases with accessibility checks enabled, including the added notice-body server-error interaction. Previous browser coverage also exercised simultaneous basic and answer validation, focus order, combined circle saves, and direct registration email submission. Separate earlier Storybook runs found two accessibility failures reproduced before this follow-up:

- The registration-denied warning has a color contrast ratio of 4.18 instead of 4.5. It was reproduced from commit `3da94d87` after waiting for the warning to render.
- The circle detail leader notice has a color contrast ratio of 4.28 instead of 4.5. It was reproduced from commit `2e238680` with the same mixed-form fixture and a successful save that stays on the detail page.

Those two historical contrast cases were not part of the fourteen-file fixed-form browser run above. Accessibility checks remain enabled; real-API integration tests are separate from these mocked browser checks.

The schema-generated-UI migration above passes typecheck, lint without diagnostics, formatter check, and all 832 unit tests across 143 files. A targeted Storybook run over the seventeen story files touched by this migration exercises 53 Chromium cases with accessibility checks enabled; 51 pass. The 2 failures are the same already-documented contrast cases: the registration-denied warning in `circles/new`'s "Cannot Create" story (4.18 instead of 4.5) and the circle detail leader notice in the "Validate Basic Information And Answers" story (4.28 instead of 4.5).
