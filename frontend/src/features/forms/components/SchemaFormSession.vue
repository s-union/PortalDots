<script setup lang="ts" generic="TSchema extends GroupedFormSchema">
import { watch } from 'vue'
import type { FormStore, ValidationMode } from '@formisch/vue'
import type * as v from 'valibot'
import {
  useSchemaForm,
  type GroupedFormSchema,
  type GroupedFieldPath,
  type SchemaFormSnapshot,
  type SchemaFormSaveResult,
  type SchemaFormInput
} from '@/features/forms/composables/useSchemaForm'

const { schema, input, source, sourceKey, disabled, focusOrder, saveInput, validateOn, initialState } = defineProps<{
  schema: TSchema
  input: SchemaFormInput<TSchema>
  source: unknown
  sourceKey: string | null
  disabled: boolean
  focusOrder: readonly GroupedFieldPath<NoInfer<TSchema>>[]
  saveInput: (
    input: v.InferOutput<TSchema>,
    event: SubmitEvent,
    schema: TSchema
  ) => Promise<SchemaFormSaveResult<TSchema> | null>
  validateOn?: ValidationMode
  initialState: SchemaFormSnapshot<TSchema> | undefined
}>()
const emit = defineEmits<{ 'update:dirty': [dirty: boolean]; 'update:submitting': [submitting: boolean]; saved: [] }>()
defineSlots<{ default(props: { schema: TSchema; form: FormStore<TSchema> }): unknown }>()
const { form, getSnapshot, submitEvent } = useSchemaForm({
  schema: () => schema,
  input: () => input,
  source: () => source,
  sourceKey: () => sourceKey,
  disabled: () => disabled,
  focusOrder: () => focusOrder,
  saveInput: (input, event, schema) => (event ? saveInput(input, event, schema) : Promise.resolve(null)),
  validateOn,
  onSaved: () => emit('saved'),
  initialState
})
watch(
  () => form.isDirty,
  (dirty) => emit('update:dirty', dirty),
  { immediate: true, flush: 'sync' }
)
watch(
  () => form.isSubmitting,
  (pending) => emit('update:submitting', pending),
  { immediate: true, flush: 'sync' }
)
defineExpose({ getSnapshot })
</script>

<template>
  <form novalidate @submit="submitEvent"><slot :schema="schema" :form="form" /></form>
</template>
