import * as v from 'valibot'
import type { ObjectEntries } from './types'

/**
 * Fields placed side by side (`md:grid-cols-2`). Entries are field keys, or `{ display, label }`
 * items (see `LayoutDisplay`) so a read-only value can sit next to an editable field in the same
 * row (e.g. the email-verify page's studentId/univemail pair).
 *
 * `label`/`caption` are a deviation from the design contract: the 'settings' layout variant
 * renders one shared left-column caption per row (see `src/pages/staff/forms/[formId]/edit.vue`'s
 * "必要人数" row), and `LayoutItem` has no other place to carry that shared text. They are
 * ignored by the 'stack' variant. `testId` is also a deviation, letting a page keep an existing
 * `data-testid` test hook on the row after migrating to a schema-driven layout.
 */
export interface LayoutRow {
  row: readonly (string | LayoutDisplay)[]
  label?: string
  caption?: string
  testId?: string
  /** Stack multiple controls in a single captioned settings row. */
  stacked?: boolean
  /** Compact label-to-control spacing used by existing text settings rows. */
  compact?: boolean
}

/** A collapsible or plain group of layout items, rendered as `<details>` when `collapsible`. */
export interface LayoutSection {
  section: string
  /** Bordered disclosure used by the staff form create page. */
  panel?: boolean
  description?: string
  collapsible?: boolean
  items: readonly LayoutItem[]
}

/** Renders the named slot (`slot:<name>`) at this position; used for non-field content. */
export interface LayoutSlot {
  slot: string
}

/** A static heading, not tied to any field (e.g. a dynamic-answer form's "heading" question). */
export interface LayoutHeading {
  heading: string
  description?: string
}

/**
 * A plain field key with an attached `testId`. A bare string field key is still the common case;
 * use this form only to keep an existing `data-testid` test hook after migrating a page to a
 * schema-driven layout.
 */
export interface LayoutField {
  field: string
  testId?: string
}

/**
 * A read-only display row whose value comes from `SchemaFormFields`' `displayValues` prop and
 * whose label comes from this `label`, both keyed/overridable at runtime by `display` — see
 * `displayValues`/`displayLabels`. Used for server-supplied, non-editable values shown alongside
 * editable fields (e.g. a locked student ID or university email address).
 */
export interface LayoutDisplay {
  display: string
  label: string
  disabled?: boolean
}

/** A field key (dotted path for nested groups, e.g. `'basic.name'`), or a composite layout item. */
export type LayoutItem = string | LayoutField | LayoutRow | LayoutSection | LayoutSlot | LayoutHeading | LayoutDisplay

export type FormLayoutVariant = 'stack' | 'settings' | 'list' | 'editor'

/** Attaches form-level layout metadata to an object schema: `v.pipe(v.object({...}), formLayout([...]))`. */
export function formLayout<TInput = never>(
  layout: readonly LayoutItem[]
): v.MetadataAction<TInput, { readonly layout: readonly LayoutItem[] }> {
  // See `fieldUi()` in `./ui.ts` for why this stays generic over `TInput` instead of hardcoding it.
  return v.metadata<TInput, { readonly layout: readonly LayoutItem[] }>({ layout })
}

/** Reads the `formLayout()` metadata attached to a form schema, if any. */
export function getFormLayout(schema: v.GenericSchema): readonly LayoutItem[] | undefined {
  return v.getMetadata(schema).layout as readonly LayoutItem[] | undefined
}

/**
 * Resolves the layout to render: the schema's `formLayout()` metadata if present, otherwise one
 * row per entry in object-entry order.
 */
export function resolveLayout(schema: v.GenericSchema & { entries: ObjectEntries }): readonly LayoutItem[] {
  return getFormLayout(schema) ?? Object.keys(schema.entries)
}
