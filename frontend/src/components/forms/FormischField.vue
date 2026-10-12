<script setup lang="ts" generic="TSchema extends FormSchema, TPath extends RequiredPath">
import { computed, useId } from 'vue'
import {
  useField,
  type FieldStore,
  type FormStore,
  type FormSchema,
  type RequiredPath,
  type ValidPath
} from '@formisch/vue'
import type { FieldControl } from './field-control'
import type * as v from 'valibot'
import FormField from '@/components/ui/FormField.vue'

const {
  of,
  path,
  label,
  helper,
  required,
  requiredLabel,
  labelClass,
  as = 'div',
  id = useId(),
  hideLabel,
  ariaLabelledby,
  disabled
} = defineProps<{
  of: FormStore<TSchema>
  path: ValidPath<v.InferInput<NoInfer<TSchema>>, TPath>
  label: string
  helper?: string
  required?: boolean
  requiredLabel?: string
  labelClass?: string
  id?: string
  as?: 'div' | 'fieldset'
  /** See `FormField`'s `hideLabel`. */
  hideLabel?: boolean
  /** See `FormField`'s `ariaLabelledby`. */
  ariaLabelledby?: string
  /**
   * Whether the field's control is disabled. A disabled field doesn't present its errors (no
   * `border-danger`, `aria-invalid`, error `aria-describedby`, or rendered `FormError`) — matching
   * hand-written pages that suppressed errors while a field couldn't be edited (e.g. a locked
   * circle group name).
   */
  disabled?: boolean
}>()
const field = useField(
  () => of,
  () => ({ path })
)
const presentsError = computed(() => !disabled && !!field.errors)
const control = computed(() => ({
  ...field.props,
  name: path.join('.'),
  'data-field-path': JSON.stringify(path),
  class: { 'border-danger': presentsError.value },
  id,
  'aria-invalid': presentsError.value,
  'aria-describedby':
    [helper && `${id}-helper`, presentsError.value && `${id}-error`].filter(Boolean).join(' ') || undefined
}))
defineSlots<{
  default(props: { field: FieldStore<TSchema, TPath>; control: FieldControl }): unknown
}>()
</script>

<template>
  <FormField
    :id="id"
    :as="as"
    :label="label"
    :helper="helper"
    :required="required"
    :required-label="requiredLabel"
    :label-class="labelClass"
    :error="presentsError ? field.errors?.[0] : undefined"
    :hide-label="hideLabel"
    :aria-labelledby="ariaLabelledby"
  >
    <slot :field="field" :control="control" />
  </FormField>
</template>
