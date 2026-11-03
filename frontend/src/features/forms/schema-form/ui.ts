import * as v from 'valibot'

/**
 * One selectable option shared by select/radio/checkboxGroup/colorRadio controls.
 */
export interface FieldOption {
  value: string | number
  label: string
  disabled?: boolean
  /** Secondary text shown under the label (e.g. a document's description in a checkbox list). */
  description?: string
}

interface FieldUiCommon {
  /** Label structure and required marker presentation, independent of native validation. */
  as?: 'label' | 'div' | 'fieldset'
  requiredLabel?: string
  labelVariant?: 'answer'
  helperAs?: 'span' | 'p'
  helperClass?: string
  /** Extra class applied to the rendered `<label>`/`<legend>`. */
  labelClass?: string
  /** Extra class applied to the rendered control element. */
  inputClass?: string
  /**
   * Explicit required override. Only set this when `isRequiredField` cannot derive
   * requiredness from the schema (see `./required.ts`).
   */
  required?: boolean
  /** Long descriptive text shown in the left column of the 'settings' layout variant. */
  caption?: string
  /**
   * Overrides the rendered `id` (and its derived `${id}-error`/`${id}-helper`), which otherwise
   * defaults to the field key. Deviation from the design contract: it lists no `id` key, but some
   * pre-existing pages have tests asserting specific ids (e.g. `#contact-category-error`) that
   * predate the field's schema key and can't be renamed without also renaming the submitted
   * field (its `name` attribute). This is schema-level (not a per-render `FieldOverride`) because,
   * unlike `options`/`helper`/etc., it never depends on runtime queries or state.
   */
  id?: string
  /**
   * Overrides the rendered `name` attribute, independently of `id` and the field key. Deviation
   * from the design contract: dynamic-answer forms render a bare question id (e.g. `name="q-1"`)
   * for every control regardless of whether it lives under `text.*` or `choices.*`, which the
   * field key alone can't express (and which must stay distinct from `id`, since e.g. `contact`'s
   * `categoryId` keeps `name="categoryId"` — for its submitted payload — while using a legacy `id`).
   */
  name?: string
}

/**
 * UI metadata attached to a field schema through `fieldUi()`. The control kind selects
 * which component `SchemaFieldControl.vue` renders.
 */
export type FieldUi = FieldUiCommon &
  (
    | {
        control: 'text' | 'email' | 'tel' | 'password' | 'url'
        label: string
        helper?: string
        placeholder?: string
        autocomplete?: string
        /** Static text rendered immediately before the input (e.g. a fixed prefix). */
        prefix?: string
        /** Static text rendered immediately after the input (e.g. `@example.ac.jp`). Runtime-computed values use `FieldOverride.suffix`. */
        suffix?: string
      }
    | {
        control: 'number'
        label: string
        helper?: string
        placeholder?: string
        min?: number
        max?: number
        step?: number
        /**
         * Keeps the native input's raw string value instead of coercing it to a JS number (the
         * default, for a `v.number()`-backed field). Set this when the field's own schema is a
         * `v.string()` with custom numeric validation (e.g. a dynamic answer's "number" question,
         * which stores and re-validates numeric answers as strings).
         */
        stringValue?: boolean
      }
    | { control: 'textarea' | 'markdown'; label: string; helper?: string; placeholder?: string; rows?: number }
    | {
        control: 'select' | 'radio'
        label: string
        helper?: string
        options?: readonly FieldOption[]
        placeholderOption?: string
        /**
         * Keep rendering the current value as a disabled extra option when it is no longer in
         * `options` (e.g. a dynamic-answer selection whose option was later removed from the
         * question). Fixed forms leave this unset and are unaffected.
         */
        keepUnavailableValue?: boolean
      }
    // Single boolean control (reuses CheckboxField.vue, unless `variant: 'card'`).
    | {
        control: 'checkbox'
        label: string
        helper?: string
        checkboxLabel?: string
        /** Secondary text shown under `checkboxLabel` (only rendered by `variant: 'card'`). */
        description?: string
        /** `'card'` renders a bordered box with a bold label and muted description (see ContactForm's ccSubleader). */
        variant?: 'default' | 'card'
      }
    // String[] control (a fieldset of checkboxes).
    | {
        control: 'checkboxGroup'
        label: string
        helper?: string
        options?: readonly FieldOption[]
        keepUnavailableValue?: boolean
        /** Shown instead of the checkbox list while `FieldOverride.loading` is true. */
        loadingMessage?: string
        /** Shown instead of the checkbox list when there are no options and this is set. */
        emptyMessage?: string
      }
    | { control: 'datetime'; label: string; helper?: string }
    // 'tags' reuses StaffTagPicker.vue, 'users' reuses StaffUserPicker.vue.
    | { control: 'tags' | 'users'; label: string; helper?: string; placeholder?: string; emptyMessage?: string }
    | { control: 'colorRadio'; label: string; helper?: string; options?: readonly FieldOption[] }
  )

export type FieldUiControl = FieldUi['control']

/**
 * Attaches UI metadata to a field schema. Usable inside `v.pipe(...)`:
 * `v.pipe(v.string(), v.minLength(1, '...'), fieldUi({ control: 'text', label: '名前' }))`.
 */
export function fieldUi<TInput = never>(ui: FieldUi): v.MetadataAction<TInput, { readonly ui: FieldUi }> {
  // A `MetadataAction`'s `~types.output` equals its `~types.input` (see `BaseMetadata`), and
  // `v.pipe(...)`'s `InferOutput` is its last item's output — so a non-generic `TInput` here
  // (e.g. hardcoding `never`) would collapse the *whole* schema's output to that type whenever
  // `fieldUi(...)` is the pipe's last item. Staying generic over `TInput` lets each `v.pipe(...)`
  // call site infer it contextually from the preceding schema's own output type instead, exactly
  // as calling `v.metadata(...)` directly (as other schemas in this codebase do) would.
  return v.metadata<TInput, { readonly ui: FieldUi }>({ ui })
}

/** Reads the `fieldUi()` metadata attached to a field schema. Throws if none was attached. */
export function getFieldUi(schema: v.GenericSchema): FieldUi {
  const ui = v.getMetadata(schema).ui as FieldUi | undefined
  if (!ui) throw new Error('Schema is missing fieldUi() metadata; wrap it with fieldUi({ ... }).')
  return ui
}

const FIELDSET_CONTROLS = new Set<FieldUiControl>(['checkbox', 'checkboxGroup', 'radio', 'colorRadio'])

/**
 * Whether a control groups multiple native inputs under one label and therefore needs
 * `FormischField`'s `as="fieldset"` (a `<legend>` instead of a `<label>`).
 */
export function isFieldsetControl(control: FieldUiControl): boolean {
  return FIELDSET_CONTROLS.has(control)
}
