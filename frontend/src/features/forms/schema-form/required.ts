import * as v from 'valibot'
import { getFieldUi, type FieldUi } from './ui'

interface PipeNode {
  readonly kind?: string
  readonly type?: string
  readonly requirement?: unknown
  readonly pipe?: readonly PipeNode[]
  readonly wrapped?: PipeNode
}

// Valibot's pipe() spreads its first item's properties onto the result (see getMetadata's own
// depth-first walk in valibot/dist/index.mjs), so a schema built from nested v.pipe() calls needs
// the same recursive flattening to see every validation action, not just the outermost pipe. This
// also recurses into every pipe item (not just item 0), so a wrapper schema (optional/nullable/...)
// used as a later pipe item is still found, not just one at the very start of the chain.
function collectPipeItems(schema: unknown): PipeNode[] {
  const node = schema as PipeNode
  if (!node.pipe) return [node]
  return node.pipe.flatMap((item) => (item.kind === 'schema' ? collectPipeItems(item) : [item]))
}

const OPTIONAL_TYPES = new Set(['optional', 'exact_optional', 'nullable', 'nullish', 'undefinedable'])

// `fieldUi()`'s metadata usually lives on the same pipe as the field's own validations (the common
// pattern in this codebase: `v.pipe(v.optional(inner, default), ..., fieldUi(...))`), which
// `getFieldUi` already finds directly. If a schema instead attaches `fieldUi()` *inside* a wrapper
// (e.g. `v.optional(v.pipe(inner, fieldUi(...)), default)`), the metadata lives on `.wrapped`
// instead, invisible to `v.getMetadata` on the outer wrapper (it has no `.pipe` of its own) — so
// this recurses through `.wrapped` as a fallback.
function tryGetFieldUi(schema: v.GenericSchema): FieldUi | undefined {
  try {
    return getFieldUi(schema)
  } catch {
    const wrapped = (schema as PipeNode).wrapped
    return wrapped ? tryGetFieldUi(wrapped as v.GenericSchema) : undefined
  }
}

/**
 * Derives whether a field is required from its schema: not optional/nullable/undefinedable/nullish,
 * and either
 * - a string/array with a `min_length`/`non_empty` validation requiring at least one character/item,
 * - a number with a `min_value` validation requiring at least 1, or any other non-optional number
 *   (a present number is inherently required),
 * - a boolean with a literal `v.value(true, ...)` check ("must be checked"), or
 * - an explicit `ui.required` override, when the above cannot express the rule.
 *
 * An explicit `ui.required` always wins, even for an optional/nullable/... schema — it's the only
 * way to mark a field required when derivation can't (and the reverse: opting a derived-required
 * field out of the marker). Used for both the label's required marker and the control's native
 * `required`/`aria-required`.
 */
export function isRequiredField(schema: v.GenericSchema): boolean {
  const ui = tryGetFieldUi(schema)
  if (ui?.required !== undefined) return ui.required

  const items = collectPipeItems(schema)
  if (items.some((item) => !!item.type && OPTIONAL_TYPES.has(item.type))) return false

  // pipe()'s spread propagates the innermost base schema's `type` up through every wrapping
  // pipe, so the top-level `type` already reflects the real base schema (string/number/...).
  if ((schema as PipeNode).type === 'number') return true

  for (const item of items) {
    if (item.type === 'non_empty') return true
    if (item.type === 'min_length' && typeof item.requirement === 'number' && item.requirement >= 1) return true
    if (item.type === 'min_value' && typeof item.requirement === 'number' && item.requirement >= 1) return true
    if (item.type === 'value' && item.requirement === true) return true
  }
  return false
}
