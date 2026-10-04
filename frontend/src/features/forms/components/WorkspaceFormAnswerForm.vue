<script setup lang="ts">
import { Form, getInput, reset, useForm } from '@formisch/vue'
import { computed, watch } from 'vue'
import SchemaAnswerFields from '@/components/forms/SchemaAnswerFields.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import type { FormDetail } from '@/features/forms/api'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'
import { buildAnswerFormInput, buildAnswerFormSchema } from '@/features/forms/answer-form-schema'
import { buttonVariants } from '@/lib/ui/variants'

const {
  form,
  answer,
  disabled,
  saveAnswer,
  selectedFiles,
  uploadPending,
  uploadErrorMessages,
  downloadHref,
  errorMessage
} = defineProps<{
  form: FormDetail
  answer: FormAnswer | null
  disabled: boolean
  saveAnswer: (draft: FormAnswerDraft) => Promise<FormAnswer | null>
  selectedFiles: Record<string, File | null>
  uploadPending: boolean
  uploadErrorMessages: Record<string, string>
  downloadHref: (questionId: string) => string
  errorMessage: string
}>()

const emit = defineEmits<{
  upload: [questionId: string]
  fileChange: [questionId: string, file: File | null]
  'update:dirty': [dirty: boolean]
}>()

// The parent mounts this component once the questions are loaded, and keys it
// by their validation definition so a structural change creates a matching store.
// Presentation-only refreshes update the metadata without discarding edits.
const schema = computed(() => buildAnswerFormSchema(form.questions, { legacyBody: true }))
const answerForm = useForm({
  get schema() {
    return schema.value
  },
  initialInput: buildAnswerFormInput(schema.value, answer),
  validate: 'blur',
  revalidate: 'input'
})

watch(
  () => answerForm.isDirty,
  (dirty) => emit('update:dirty', dirty),
  { immediate: true, flush: 'sync' }
)

watch(
  () => answer,
  (nextAnswer, previousAnswer) => {
    // Uploads and background refreshes also update the answer query. Preserve
    // current edits while advancing their baseline to the latest server state.
    resetAnswer(nextAnswer, answerForm.isDirty && (!previousAnswer || nextAnswer?.id === previousAnswer.id))
  }
)

function resetAnswer(nextAnswer: FormAnswer | null, keepInput: boolean) {
  const initialInput = buildAnswerFormInput(schema.value, nextAnswer)
  if (answerForm.isSubmitting) {
    // A form-wide reset also cancels Formisch's submission state. Reset only
    // fields while a save is pending so the submit button stays disabled.
    for (const [questionId, input] of Object.entries(initialInput)) {
      reset(answerForm, { path: [questionId], initialInput: input, keepInput })
    }
  } else {
    reset(answerForm, { initialInput, keepInput })
  }
}

async function submitAnswer(values: FormAnswerDraft) {
  if (disabled) {
    return
  }
  const submittedAnswerId = answer?.id
  const submittedInput = JSON.stringify(values)
  const savedAnswer = await saveAnswer(values)
  const isCurrentAnswer = answer?.id === submittedAnswerId || (!submittedAnswerId && answer?.id === savedAnswer?.id)
  if (savedAnswer && isCurrentAnswer) {
    resetAnswer(savedAnswer, JSON.stringify(getInput(answerForm)) !== submittedInput)
  }
}
</script>

<template>
  <Form :of="answerForm" class="space-y-6" @submit="submitAnswer">
    <SurfaceCard overflow-hidden>
      <div v-if="answer" class="border-b border-border px-6 py-5 text-base text-body">
        <p class="font-semibold">{{ form.isOpen ? '回答を編集' : '回答を閲覧' }} — 回答ID : {{ answer.id }}</p>
      </div>

      <SchemaAnswerFields
        :schema="schema"
        :form="answerForm"
        :answer="answer"
        :disabled="disabled"
        :selected-files="selectedFiles"
        :upload-pending="uploadPending"
        :upload-error-messages="uploadErrorMessages"
        :download-href="downloadHref"
        @upload="emit('upload', $event)"
        @file-change="(questionId, file) => emit('fileChange', questionId, file)"
      />
    </SurfaceCard>

    <AlertMessage v-if="errorMessage" tone="danger">{{ errorMessage }}</AlertMessage>

    <ActionsFooter align="center">
      <button
        :class="buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' })"
        :disabled="disabled || answerForm.isSubmitting"
        type="submit"
      >
        {{ answerForm.isSubmitting ? '送信中...' : '送信' }}
      </button>
    </ActionsFooter>
  </Form>
</template>
