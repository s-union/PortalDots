<script
  setup
  lang="ts"
  generic="TEntries extends ObjectEntries, TSchema extends SchemaFormSchema<TEntries> = SchemaFormSchema<TEntries>"
>
import { computed, useSlots } from 'vue'
import type { FieldStore, FormSchema, FormStore, RequiredPath } from '@formisch/vue'
import type { FieldControl } from '@/components/forms/field-control'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SchemaFormField from './SchemaFormField.vue'
import { getFieldUi, isFieldsetControl } from './ui'
import { isRequiredField } from './required'
import { resolveLayout, type FormLayoutVariant, type LayoutDisplay, type LayoutField, type LayoutItem } from './layout'
import {
  resolveFieldSchema,
  type FieldKey,
  type FieldOverride,
  type FieldOverrides,
  type ObjectEntries,
  type SchemaFormSchema
} from './types'

const {
  of,
  schema,
  disabled = false,
  variant = 'stack',
  requiredLabel,
  overrides,
  displayValues,
  displayLabels,
  layout
} = defineProps<{
  of: FormStore<TSchema>
  schema: TSchema
  disabled?: boolean
  variant?: FormLayoutVariant
  /** Text of the required marker next to each label (defaults to `FormField`'s own `'*'`). */
  requiredLabel?: string
  overrides?: FieldOverrides<TEntries>
  /** Values for `{ display, label }` layout items, keyed by their `display` name. */
  displayValues?: Record<string, string>
  /** Runtime overrides for `{ display, label }` layout items' own `label`, keyed by `display`. */
  displayLabels?: Record<string, string>
  /**
   * Overrides the schema's own `formLayout()` metadata (and the fallback one-row-per-entry
   * layout) with these items instead. Public API: a page can render a different arrangement of
   * the same fields than the schema's own layout (e.g. a flat settings page where the schema's
   * layout groups optional fields into a collapsible section for other pages). This component
   * also passes it to itself with a section's own `items` when recursing into that section.
   */
  layout?: readonly LayoutItem[]
}>()

const emit = defineEmits<{
  /** A registered control inside field `key` was blurred (e.g. to autosave on blur). */
  fieldBlur: [key: string]
  /** A registered control inside field `key` fired a native `change` event. */
  fieldChange: [key: string]
}>()

// Slot names use the `before:`/`after:`/`field:` prefixes rather than `before:${FieldKey<TEntries>}`
// (a finite literal union of real field keys): a computed expression like `` `field:${item}` ``
// only type-checks as a template literal *pattern* (`` `field:${string}` ``), not as one member of
// a finite union — and that computed expression is unavoidable, since the template below both
// renders dynamically keyed fields and forwards a section's slots wholesale by iterating `$slots`.
// The trailing `Record<string, ...>` is that wholesale-forwarding case, where the key is a plain
// `string` (not a template literal expression) and so matches none of the patterns above it. A
// page author writing a literal `#field:categoryId` still gets the stronger, schema-free-but-typed
// `field`/`control` shape below; per-key *schema* safety comes from `overrides`
// (`FieldOverrides<TEntries>`), which the contract calls out explicitly.
defineSlots<
  Record<`before:${string}` | `after:${string}`, (() => unknown) | undefined> &
    Record<
      `field:${string}`,
      ((props: { field: FieldStore<FormSchema, RequiredPath>; control: FieldControl }) => unknown) | undefined
    > &
    Record<`slot:${string}`, (() => unknown) | undefined> &
    Record<string, ((props: Record<string, unknown>) => unknown) | undefined>
>()

const items = computed<readonly LayoutItem[]>(() => layout ?? resolveLayout(schema))

// Dynamic (field-key-based) slot names can't be checked against defineSlots()'s precisely typed
// union, so forwarding/presence checks go through this loosely typed view of $slots instead.
const slots = useSlots() as Record<string, ((props: Record<string, unknown>) => unknown) | undefined>

function hasSlot(name: string): boolean {
  return !!slots[name]
}

function override(key: string): FieldOverride | undefined {
  return overrides?.[key as FieldKey<TEntries>]
}

interface FieldInfo {
  label: string
  caption: string | undefined
  required: boolean
  isFieldset: boolean
  id: string
  /** Only used as the fieldset's `aria-labelledby` target when `isFieldset`. */
  labelId: string
}

// The 'settings' variant renders this field's label itself (see the template below), so the
// field's own `FormischField`/`FormField` label is hidden via `hide-label` to avoid showing it
// twice — this is the single source of the label's text, id and required marker for both.
function fieldInfo(key: string): FieldInfo {
  const fieldSchema = resolveFieldSchema(schema, key)
  const ui = getFieldUi(fieldSchema)
  const id = ui.id ?? key
  return {
    label: override(key)?.label ?? ui.label,
    caption: ui.caption,
    required: isRequiredField(fieldSchema),
    isFieldset: isFieldsetControl(ui.control),
    id,
    labelId: `${id}-label`
  }
}

function displayLabel(item: LayoutDisplay): string {
  return displayLabels?.[item.display] ?? item.label
}

function isPlainField(item: LayoutItem): item is string | LayoutField {
  return typeof item === 'string' || 'field' in item
}

// A plain field key is either a bare string, or `{ field, testId }` (see `LayoutField`) when a
// page needs to keep an existing `data-testid` test hook.
function plainFieldKey(item: string | LayoutField): string {
  return typeof item === 'string' ? item : item.field
}

function plainFieldTestId(item: LayoutItem): string | undefined {
  return typeof item === 'object' && item !== null && 'field' in item ? item.testId : undefined
}

function layoutItemKey(item: LayoutItem, index: number): string {
  if (isPlainField(item)) return plainFieldKey(item)
  if ('row' in item) return `row:${index}`
  if ('section' in item) return `section:${item.section}`
  if ('heading' in item) return `heading:${item.heading}`
  if ('display' in item) return `display:${item.display}`
  return `slot:${item.slot}:${index}`
}

function rowItemKey(entry: string | LayoutDisplay): string {
  return typeof entry === 'string' ? entry : `display:${entry.display}`
}

// The 'list' variant (used by dynamic-answer forms) borders each top-level field/heading like a
// list row, matching the pre-schema-driven `SchemaAnswerFields.vue` markup.
const listItemClass = 'border-b border-border px-6 py-5 last:border-b-0'
</script>

<template>
  <template v-for="(item, index) in items" :key="layoutItemKey(item, index)">
    <!-- Plain field key, wrapped in a settings-variant caption row when applicable. -->
    <SettingsRow v-if="isPlainField(item) && variant === 'settings'" :data-testid="plainFieldTestId(item)">
      <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
        <div class="space-y-1">
          <label
            v-if="!fieldInfo(plainFieldKey(item)).isFieldset"
            :for="fieldInfo(plainFieldKey(item)).id"
            class="text-base font-semibold text-body"
          >
            {{ fieldInfo(plainFieldKey(item)).label }}
            <span v-if="fieldInfo(plainFieldKey(item)).required" class="text-danger">{{ requiredLabel ?? '*' }}</span>
          </label>
          <p v-else :id="fieldInfo(plainFieldKey(item)).labelId" class="text-base font-semibold text-body">
            {{ fieldInfo(plainFieldKey(item)).label }}
            <span v-if="fieldInfo(plainFieldKey(item)).required" class="text-danger">{{ requiredLabel ?? '*' }}</span>
          </p>
          <p v-if="fieldInfo(plainFieldKey(item)).caption" class="text-xs text-muted-2">
            {{ fieldInfo(plainFieldKey(item)).caption }}
          </p>
        </div>
        <!--
          A single wrapping element: SchemaFormField renders `before`/FormischField/`after` as
          sibling fragments, and this `<div>` is this row's *second* (not third+) grid child —
          without it, `before`/`after` content would become stray grid items that wrap onto the
          next row's 14rem label column instead of staying in the field column.
        -->
        <div class="grid gap-2">
          <SchemaFormField
            :of="of"
            :schema="schema"
            :field-key="plainFieldKey(item)"
            :disabled="disabled"
            :required-label="requiredLabel"
            :override="override(plainFieldKey(item))"
            hide-label
            :label-id="fieldInfo(plainFieldKey(item)).labelId"
            @blur="emit('fieldBlur', plainFieldKey(item))"
            @change="emit('fieldChange', plainFieldKey(item))"
          >
            <template v-if="hasSlot(`before:${plainFieldKey(item)}`)" #before>
              <slot :name="`before:${plainFieldKey(item)}`" />
            </template>
            <template v-if="hasSlot(`after:${plainFieldKey(item)}`)" #after>
              <slot :name="`after:${plainFieldKey(item)}`" />
            </template>
            <template v-if="hasSlot(`field:${plainFieldKey(item)}`)" #field="{ field, control }">
              <slot :name="`field:${plainFieldKey(item)}`" :field="field" :control="control" />
            </template>
          </SchemaFormField>
        </div>
      </div>
    </SettingsRow>
    <div v-else-if="isPlainField(item) && variant === 'list'" :class="listItemClass">
      <SchemaFormField
        :of="of"
        :schema="schema"
        :field-key="plainFieldKey(item)"
        :disabled="disabled"
        :required-label="requiredLabel"
        :override="override(plainFieldKey(item))"
        @blur="emit('fieldBlur', plainFieldKey(item))"
        @change="emit('fieldChange', plainFieldKey(item))"
      >
        <template v-if="hasSlot(`before:${plainFieldKey(item)}`)" #before>
          <slot :name="`before:${plainFieldKey(item)}`" />
        </template>
        <template v-if="hasSlot(`after:${plainFieldKey(item)}`)" #after>
          <slot :name="`after:${plainFieldKey(item)}`" />
        </template>
        <template v-if="hasSlot(`field:${plainFieldKey(item)}`)" #field="{ field, control }">
          <slot :name="`field:${plainFieldKey(item)}`" :field="field" :control="control" />
        </template>
      </SchemaFormField>
    </div>
    <SchemaFormField
      v-else-if="isPlainField(item)"
      :of="of"
      :schema="schema"
      :field-key="plainFieldKey(item)"
      :disabled="disabled"
      :required-label="requiredLabel"
      :override="override(plainFieldKey(item))"
      @blur="emit('fieldBlur', plainFieldKey(item))"
      @change="emit('fieldChange', plainFieldKey(item))"
    >
      <template v-if="hasSlot(`before:${plainFieldKey(item)}`)" #before>
        <slot :name="`before:${plainFieldKey(item)}`" />
      </template>
      <template v-if="hasSlot(`after:${plainFieldKey(item)}`)" #after>
        <slot :name="`after:${plainFieldKey(item)}`" />
      </template>
      <template v-if="hasSlot(`field:${plainFieldKey(item)}`)" #field="{ field, control }">
        <slot :name="`field:${plainFieldKey(item)}`" :field="field" :control="control" />
      </template>
    </SchemaFormField>

    <!-- Fields (and read-only display items) placed side by side. -->
    <SettingsRow v-else-if="'row' in item && variant === 'settings'" :data-testid="item.testId">
      <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
        <div v-if="item.label || item.caption" class="space-y-1">
          <p v-if="item.label" class="text-base font-semibold text-body">{{ item.label }}</p>
          <p v-if="item.caption" class="text-xs text-muted-2">{{ item.caption }}</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <template v-for="entry in item.row" :key="rowItemKey(entry)">
            <SchemaFormField
              v-if="typeof entry === 'string'"
              :of="of"
              :schema="schema"
              :field-key="entry"
              :disabled="disabled"
              :required-label="requiredLabel"
              :override="override(entry)"
              @blur="emit('fieldBlur', entry)"
              @change="emit('fieldChange', entry)"
            >
              <template v-if="hasSlot(`before:${entry}`)" #before><slot :name="`before:${entry}`" /></template>
              <template v-if="hasSlot(`after:${entry}`)" #after><slot :name="`after:${entry}`" /></template>
              <template v-if="hasSlot(`field:${entry}`)" #field="{ field, control }">
                <slot :name="`field:${entry}`" :field="field" :control="control" />
              </template>
            </SchemaFormField>
            <div v-else class="grid gap-2 text-base text-body">
              <label :for="`display-${entry.display}`" class="font-semibold">{{ displayLabel(entry) }}</label>
              <input
                :id="`display-${entry.display}`"
                :value="displayValues?.[entry.display] ?? ''"
                :aria-label="displayLabel(entry)"
                :name="entry.display"
                readonly
                type="text"
              />
            </div>
          </template>
        </div>
      </div>
    </SettingsRow>
    <div v-else-if="'row' in item" class="grid gap-4 md:grid-cols-2" :data-testid="item.testId">
      <template v-for="entry in item.row" :key="rowItemKey(entry)">
        <SchemaFormField
          v-if="typeof entry === 'string'"
          :of="of"
          :schema="schema"
          :field-key="entry"
          :disabled="disabled"
          :required-label="requiredLabel"
          :override="override(entry)"
          @blur="emit('fieldBlur', entry)"
          @change="emit('fieldChange', entry)"
        >
          <template v-if="hasSlot(`before:${entry}`)" #before><slot :name="`before:${entry}`" /></template>
          <template v-if="hasSlot(`after:${entry}`)" #after><slot :name="`after:${entry}`" /></template>
          <template v-if="hasSlot(`field:${entry}`)" #field="{ field, control }">
            <slot :name="`field:${entry}`" :field="field" :control="control" />
          </template>
        </SchemaFormField>
        <div v-else class="grid gap-2 text-base text-body">
          <label :for="`display-${entry.display}`" class="font-semibold">{{ displayLabel(entry) }}</label>
          <input
            :id="`display-${entry.display}`"
            :value="displayValues?.[entry.display] ?? ''"
            :aria-label="displayLabel(entry)"
            :name="entry.display"
            readonly
            type="text"
          />
        </div>
      </template>
    </div>

    <!-- A collapsible or plain group, recursing into its own items. -->
    <details v-else-if="'section' in item && item.collapsible" class="grid gap-3">
      <summary class="cursor-pointer text-lg font-semibold text-body">{{ item.section }}</summary>
      <p v-if="item.description" class="text-sm text-muted">{{ item.description }}</p>
      <SchemaFormFields
        :of="of"
        :schema="schema"
        :disabled="disabled"
        :variant="variant"
        :required-label="requiredLabel"
        :overrides="overrides"
        :display-values="displayValues"
        :display-labels="displayLabels"
        :layout="item.items"
        @field-blur="emit('fieldBlur', $event)"
        @field-change="emit('fieldChange', $event)"
      >
        <template v-for="(_, slotName) in slots" #[slotName]="slotProps">
          <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
      </SchemaFormFields>
    </details>
    <div v-else-if="'section' in item" class="grid gap-3">
      <h2 class="text-lg font-semibold text-body">{{ item.section }}</h2>
      <p v-if="item.description" class="text-sm text-muted">{{ item.description }}</p>
      <SchemaFormFields
        :of="of"
        :schema="schema"
        :disabled="disabled"
        :variant="variant"
        :required-label="requiredLabel"
        :overrides="overrides"
        :display-values="displayValues"
        :display-labels="displayLabels"
        :layout="item.items"
        @field-blur="emit('fieldBlur', $event)"
        @field-change="emit('fieldChange', $event)"
      >
        <template v-for="(_, slotName) in slots" #[slotName]="slotProps">
          <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
      </SchemaFormFields>
    </div>

    <!-- A static heading, not tied to any field. -->
    <div v-else-if="'heading' in item" :class="variant === 'list' ? listItemClass : undefined">
      <h2 class="text-lg font-semibold text-body">{{ item.heading }}</h2>
      <p v-if="item.description" class="mt-3 whitespace-pre-wrap text-base leading-7 text-muted">
        {{ item.description }}
      </p>
    </div>

    <!-- A read-only display row backed by `displayValues`/`displayLabels`, not the schema/form store. -->
    <SettingsRow v-else-if="'display' in item && variant === 'settings'">
      <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-center md:gap-x-6">
        <label :for="`display-${item.display}`" class="font-semibold">{{ displayLabel(item) }}</label>
        <input
          :id="`display-${item.display}`"
          :value="displayValues?.[item.display] ?? ''"
          :aria-label="displayLabel(item)"
          :name="item.display"
          readonly
          type="text"
        />
      </div>
    </SettingsRow>
    <div v-else-if="'display' in item" class="grid gap-2 text-base text-body">
      <label :for="`display-${item.display}`" class="font-semibold">{{ displayLabel(item) }}</label>
      <input
        :id="`display-${item.display}`"
        :value="displayValues?.[item.display] ?? ''"
        :aria-label="displayLabel(item)"
        :name="item.display"
        readonly
        type="text"
      />
    </div>

    <!-- Non-field layout slot. -->
    <div v-else-if="'slot' in item && variant === 'list'" :class="listItemClass">
      <slot :name="`slot:${item.slot}`" />
    </div>
    <slot v-else-if="'slot' in item" :name="`slot:${item.slot}`" />
  </template>
</template>
