<script setup lang="ts">
import { computed } from 'vue'
import type { FieldStore, FormSchema, FormStore, RequiredPath } from '@formisch/vue'
import type * as v from 'valibot'
import FormischField from '@/components/forms/FormischField.vue'
import type { FieldControl } from '@/components/forms/field-control'
import SchemaFieldControl from './SchemaFieldControl.vue'
import { getFieldUi, isFieldsetControl } from './ui'
import { isRequiredField } from './required'
import { fieldKeyPath, resolveFieldSchema, type FieldOverride, type ObjectEntries } from './types'

// Internal building block of SchemaFormFields.vue: renders exactly one field identified by its
// dotted `fieldKey`. Loosely typed on purpose (the public SchemaFormFields.vue checks `fieldKey`
// and `override` against the real schema before reaching here).
const {
  of,
  schema,
  fieldKey,
  disabled = false,
  requiredLabel,
  override,
  hideLabel,
  labelId
} = defineProps<{
  of: FormStore<FormSchema>
  schema: v.GenericSchema & { entries: ObjectEntries }
  fieldKey: string
  disabled?: boolean
  requiredLabel?: string
  override?: FieldOverride
  /** See `FormField`'s `hideLabel`; set by `SchemaFormFields`' 'settings' variant. */
  hideLabel?: boolean
  /** The id of the external label/caption, used as the fieldset's `aria-labelledby` when `hideLabel`. */
  labelId?: string
}>()

const emit = defineEmits<{ blur: []; change: [] }>()

defineSlots<{
  before?(): unknown
  after?(): unknown
  field?(props: { field: FieldStore<FormSchema, RequiredPath>; control: FieldControl }): unknown
}>()

const path = computed(() => fieldKeyPath(fieldKey))
const fieldSchema = computed(() => resolveFieldSchema(schema, fieldKey))
const ui = computed(() => getFieldUi(fieldSchema.value))
const required = computed(() => isRequiredField(fieldSchema.value))
const effectiveDisabled = computed(() => disabled || !!override?.disabled)

// Lets `SchemaFormFields` emit `fieldBlur`/`fieldChange` (e.g. for autosave-on-blur question
// editors) without replacing Formisch's own focus/validation handlers.
function withEmittedEvents(control: FieldControl): FieldControl {
  return {
    ...control,
    onBlur: () => {
      control.onBlur()
      emit('blur')
    },
    onChange: (event: Event) => {
      control.onChange(event)
      emit('change')
    }
  }
}
</script>

<template>
  <template v-if="!override?.hidden">
    <slot name="before" />
    <FormischField
      v-slot="{ field, control }"
      :of="of"
      :path="path"
      :id="ui.id ?? fieldKey"
      :label="override?.label ?? ui.label"
      :helper="override?.helper ?? ui.helper"
      :required="required"
      :required-label="requiredLabel"
      :label-class="ui.labelClass"
      :as="isFieldsetControl(ui.control) ? 'fieldset' : 'div'"
      :hide-label="hideLabel"
      :aria-labelledby="labelId"
      :disabled="effectiveDisabled"
    >
      <slot name="field" :field="field" :control="withEmittedEvents(control)">
        <SchemaFieldControl
          :ui="ui"
          :field="field"
          :control="withEmittedEvents(control)"
          :disabled="effectiveDisabled"
          :readonly="override?.readonly"
          :required="required"
          :override="override"
          :name="ui.name ?? fieldKey"
        />
      </slot>
    </FormischField>
    <slot name="after" />
  </template>
</template>
