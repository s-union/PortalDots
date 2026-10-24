<script setup lang="ts">
import { computed } from 'vue'
import type { FormStore } from '@formisch/vue'
import SchemaFormEditor from './SchemaFormEditor.vue'
import {
  answerFormStructureKey,
  answerFormFieldPaths,
  answerFormInputToDraft,
  buildAnswerFormInput,
  buildAnswerFormSchema,
  type AnswerFormSchema,
  type AnswerFormInput
} from '@/features/forms/answer-form-schema'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswer, FormAnswerDraft, AnswerFormSaveResult } from '@/features/forms/answers'

const {
  questions,
  answer,
  disabled,
  saveAnswer,
  legacyBody = false
} = defineProps<{
  questions: FormQuestion[]
  answer: FormAnswer | null
  disabled: boolean
  saveAnswer: (draft: FormAnswerDraft) => Promise<AnswerFormSaveResult | null>
  legacyBody?: boolean
}>()
const emit = defineEmits<{ 'update:dirty': [dirty: boolean]; saved: [] }>()
defineSlots<{ default(props: { schema: AnswerFormSchema; form: FormStore<AnswerFormSchema> }): unknown }>()
const schema = computed(() => buildAnswerFormSchema(questions, { legacyBody }))
const input = computed(() => buildAnswerFormInput(schema.value, answer))

async function saveInput(input: AnswerFormInput, _event: SubmitEvent, schema: AnswerFormSchema) {
  const result = await saveAnswer(answerFormInputToDraft(schema, input))
  return result ? { input: buildAnswerFormInput(schema, result.answer), sourceKey: result.answer?.id ?? null } : null
}
</script>

<template>
  <SchemaFormEditor
    :schema="schema"
    :input="input"
    :source="answer"
    :source-key="answer?.id ?? null"
    :structure-key="answerFormStructureKey(schema)"
    :disabled="disabled"
    :save-input="saveInput"
    :focus-order="answerFormFieldPaths(schema)"
    @update:dirty="emit('update:dirty', $event)"
    @saved="emit('saved')"
    v-slot="{ schema: activeSchema, form }"
  >
    <slot :schema="activeSchema" :form="form" />
  </SchemaFormEditor>
</template>
