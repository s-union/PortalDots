<script setup lang="ts" generic="TSchema extends GroupedFormSchema">
import { shallowRef, useTemplateRef, watch } from 'vue'
import type { FormStore } from '@formisch/vue'
import type * as v from 'valibot'
import SchemaFormSession from './SchemaFormSession.vue'
import type {
  GroupedFormSchema,
  GroupedFieldPath,
  SchemaFormSnapshot,
  SchemaFormSaveResult,
  SchemaFormInput
} from '@/features/forms/composables/useSchemaForm'

const { schema, input, source, sourceKey, structureKey, disabled, focusOrder, saveInput, beforeSubmit } = defineProps<{
  schema: TSchema
  input: SchemaFormInput<TSchema>
  source: unknown
  sourceKey: string | null
  structureKey: string
  disabled: boolean
  focusOrder: readonly GroupedFieldPath[]
  saveInput: (
    input: v.InferOutput<TSchema>,
    event: SubmitEvent,
    schema: TSchema
  ) => Promise<SchemaFormSaveResult<TSchema> | null>
  beforeSubmit?: (event: SubmitEvent) => boolean
}>()
const emit = defineEmits<{ 'update:dirty': [dirty: boolean]; saved: [] }>()
defineSlots<{ default(props: { schema: TSchema; form: FormStore<TSchema> }): unknown }>()
const sessionSchema = shallowRef(schema)
const sessionKey = shallowRef(structureKey)
const initialState = shallowRef<SchemaFormSnapshot<TSchema>>()
const submitting = shallowRef(false)
const session = useTemplateRef('session')

watch(
  [() => schema, () => structureKey, submitting, () => sourceKey],
  ([nextSchema, nextKey, pending, key], previous) => {
    if (nextKey !== sessionKey.value) {
      if (pending) return
      const snapshot = session.value?.getSnapshot()
      const changedSource =
        (previous && previous[3] !== null && previous[3] !== key) ||
        (snapshot && snapshot.sourceKey !== null && snapshot.sourceKey !== key)
      initialState.value = changedSource ? undefined : snapshot
    }
    sessionSchema.value = nextSchema
    sessionKey.value = nextKey
  }
)
</script>

<template>
  <SchemaFormSession
    ref="session"
    :key="sessionKey"
    :schema="sessionSchema"
    :input="input"
    :source="source"
    :source-key="sourceKey"
    :disabled="disabled"
    :focus-order="focusOrder"
    :save-input="saveInput"
    :before-submit="beforeSubmit"
    :initial-state="initialState"
    @update:dirty="emit('update:dirty', $event)"
    @update:submitting="submitting = $event"
    @saved="emit('saved')"
    v-slot="state"
  >
    <slot :schema="state.schema" :form="state.form" />
  </SchemaFormSession>
</template>
