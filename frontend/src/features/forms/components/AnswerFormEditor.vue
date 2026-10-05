<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import type { FormStore } from '@formisch/vue'
import AnswerFormSession from './AnswerFormSession.vue'
import {
  answerFormStructureKey,
  buildAnswerFormSchema,
  type AnswerFormSchema
} from '@/features/forms/answer-form-schema'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'
import type { AnswerFormSnapshot } from '@/features/forms/composables/useAnswerForm'

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
  saveAnswer: (draft: FormAnswerDraft) => Promise<FormAnswer | null>
  legacyBody?: boolean
}>()
const emit = defineEmits<{ 'update:dirty': [dirty: boolean] }>()
defineSlots<{ default(props: { schema: AnswerFormSchema; form: FormStore<AnswerFormSchema> }): unknown }>()

const schema = computed(() => buildAnswerFormSchema(questions, { legacyBody }))
const sessionSchema = shallowRef(schema.value)
const initialState = shallowRef<AnswerFormSnapshot>()
const submitting = shallowRef(false)
const session = useTemplateRef('session')
const sessionKey = computed(() => answerFormStructureKey(sessionSchema.value))

watch([schema, submitting, () => answer?.id], ([nextSchema, pending, answerId], previous) => {
  if (answerFormStructureKey(nextSchema) !== sessionKey.value) {
    // Keep the submitting store mounted until its request settles, then migrate edits.
    if (pending) return
    const snapshot = session.value?.getSnapshot()
    const changedAnswer =
      (!!previous?.[2] && previous[2] !== answerId) ||
      (!!answerId && !!snapshot?.answer && snapshot.answer.id !== answerId)
    initialState.value = changedAnswer ? undefined : snapshot
  }
  sessionSchema.value = nextSchema
})
</script>

<template>
  <AnswerFormSession
    ref="session"
    :key="sessionKey"
    :schema="sessionSchema"
    :answer="answer"
    :disabled="disabled"
    :save-answer="saveAnswer"
    :initial-state="initialState"
    @update:dirty="emit('update:dirty', $event)"
    @update:submitting="submitting = $event"
    v-slot="state"
  >
    <slot :schema="state.schema" :form="state.form" />
  </AnswerFormSession>
</template>
