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
  labelClass,
  as = 'div',
  id = useId()
} = defineProps<{
  of: FormStore<TSchema>
  path: ValidPath<v.InferInput<NoInfer<TSchema>>, TPath>
  label: string
  helper?: string
  required?: boolean
  labelClass?: string
  id?: string
  as?: 'div' | 'fieldset'
}>()
const field = useField(
  () => of,
  () => ({ path })
)
const control = computed(() => ({
  ...field.props,
  name: path.join('.'),
  'data-field-path': JSON.stringify(path),
  class: { 'border-danger': !!field.errors },
  id,
  'aria-invalid': !!field.errors,
  'aria-describedby': [helper && `${id}-helper`, field.errors && `${id}-error`].filter(Boolean).join(' ') || undefined
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
    :label-class="labelClass"
    :error="field.errors?.[0]"
  >
    <slot :field="field" :control="control" />
  </FormField>
</template>
