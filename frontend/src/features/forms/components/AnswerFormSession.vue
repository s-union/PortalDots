<script setup lang="ts">
import { watch } from 'vue'
import type { FormStore } from '@formisch/vue'
import type { AnswerFormSchema } from '@/features/forms/answer-form-schema'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'
import {
  useAnswerForm,
  type AnswerFormSnapshot,
  type AnswerFormSaveResult
} from '@/features/forms/composables/useAnswerForm'

const { schema, answer, disabled, saveAnswer, initialState, beforeSubmit } = defineProps<{
  schema: AnswerFormSchema
  answer: FormAnswer | null
  disabled: boolean
  saveAnswer: (draft: FormAnswerDraft) => Promise<AnswerFormSaveResult | null>
  beforeSubmit?: (event: SubmitEvent) => boolean
  initialState: AnswerFormSnapshot | undefined
}>()

const emit = defineEmits<{
  'update:dirty': [dirty: boolean]
  'update:submitting': [submitting: boolean]
  saved: []
}>()
defineSlots<{ default(props: { schema: AnswerFormSchema; form: FormStore<AnswerFormSchema> }): unknown }>()

const { form, getSnapshot, submitEvent } = useAnswerForm({
  schema: () => schema,
  answer: () => answer,
  disabled: () => disabled,
  saveAnswer: (draft) => saveAnswer(draft),
  beforeSubmit: (event) => beforeSubmit?.(event) ?? true,
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
  (submitting) => emit('update:submitting', submitting),
  { immediate: true, flush: 'sync' }
)
defineExpose({ getSnapshot })
</script>

<template>
  <form novalidate @submit="submitEvent">
    <slot :schema="schema" :form="form" />
  </form>
</template>
