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

## Adoption and limits

The participant answer screen uses the shared editor. Other answer screens still use the flat compatibility adapter. The fixed-schema forms still use `useFormValidation`; this change does not establish an application-wide migration.

Dynamic question IDs cannot be enumerated by TypeScript. Static group names and field value kinds are checked. `answer-form-schema.test-d.ts` checks the field and control contracts as part of the frontend typecheck.

The renderer and answer synchronization policy remain application code. The grouped schema adds an API conversion and a session boundary; the benefit to evaluate is whether these shared responsibilities replace repeated page-specific form logic when the editor is adopted elsewhere.

## Checks

```sh
mise run frontend:check
cd frontend && nr test --project=unit
```

Regression coverage includes clean-field refreshes, edits made during a save, server-normalized values, schema migration, late responses, and validation focus across both value groups.
