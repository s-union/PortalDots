import type * as v from 'valibot'
import type { FieldOption } from './ui'

/** The entries map of an object schema; the shape `SchemaFormFields` renders fields from. */
export type ObjectEntries = Record<string, v.GenericSchema>

/**
 * An object schema (optionally wrapped with `v.pipe(objectSchema, formLayout([...]))`) whose
 * entries are statically known. Mirrors `@formisch/vue`'s `FormSchema` constraint
 * (`v.GenericSchema<Record<string, unknown>>`) while keeping `.entries` available for layout
 * resolution and per-field UI/required derivation.
 */
export type SchemaFormSchema<TEntries extends ObjectEntries = ObjectEntries> = v.GenericSchema<
  Record<string, unknown>
> & { entries: TEntries }

type LeafValue = string | number | boolean | readonly string[] | undefined | null
type FieldGroupValue = Record<string, LeafValue>

/**
 * Field keys accepted by `SchemaFormFields`/overrides: a top-level entry key, or (mirroring
 * `SyncedFieldPath`'s one-level nesting) a dotted `'group.name'` path into a nested group entry.
 */
export type FieldKey<TEntries extends ObjectEntries> = {
  [K in keyof TEntries & string]: NonNullable<v.InferInput<TEntries[K]>> extends readonly unknown[]
    ? K
    : NonNullable<v.InferInput<TEntries[K]>> extends FieldGroupValue
      ? `${K}.${keyof NonNullable<v.InferInput<TEntries[K]>> & string}`
      : K
}[keyof TEntries & string]

/** Splits a `FieldKey` into the tuple path `FormischField`/`useField` expect. */
export type FieldKeyPath<TKey extends string> = TKey extends `${infer TGroup}.${infer TName}`
  ? readonly [TGroup, TName]
  : readonly [TKey]

export function fieldKeyPath<TKey extends string>(key: TKey): FieldKeyPath<TKey> {
  return key.split('.') as unknown as FieldKeyPath<TKey>
}

/** Resolves a (possibly dotted) field key to its own schema within an object schema's entries. */
export function resolveFieldSchema(schema: v.GenericSchema & { entries: ObjectEntries }, key: string): v.GenericSchema {
  const [group, name] = key.split('.')
  const groupSchema = schema.entries[group as string]
  return name === undefined ? groupSchema : (groupSchema as v.GenericSchema & { entries: ObjectEntries }).entries[name]
}

/**
 * Runtime, per-field overrides for values that depend on queries, stores, or other field values
 * (e.g. `categoryId`'s `options` loaded from a query, or `ccSubleader.hidden` when there is no
 * current circle).
 */
export interface FieldOverride {
  hidden?: boolean
  disabled?: boolean
  /** Native `readonly`, where the control supports it (text-like, number, textarea). */
  readonly?: boolean
  label?: string
  hideLabel?: boolean
  wrapControl?: boolean
  helper?: string
  inputClass?: string
  placeholder?: string
  /** Runtime-computed suffix, e.g. a domain name loaded from a query (`@example.ac.jp`). */
  suffix?: string
  /** Runtime-computed prefix. */
  prefix?: string
  options?: readonly FieldOption[]
  /** Picker data for the 'tags' control (`StaffTagPicker`). */
  availableTags?: readonly string[]
  tagColors?: Record<string, string>
  /** Initial search text for the 'users' control (`StaffUserPicker`). */
  initialSearchQuery?: string
  /** Shown instead of the list/picker while data is loading ('checkboxGroup'/'tags'/'users'). */
  loading?: boolean
  /** Shown instead of the list/picker when there is nothing to show. */
  emptyMessage?: string
  /** Shown instead of the list while `loading` is true (checkboxGroup only; falls back to `emptyMessage`). */
  loadingMessage?: string
}

export type FieldOverrides<TEntries extends ObjectEntries> = Partial<Record<FieldKey<TEntries>, FieldOverride>>
