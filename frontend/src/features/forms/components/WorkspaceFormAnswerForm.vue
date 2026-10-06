<script setup lang="ts">
import AnswerFormEditor from './AnswerFormEditor.vue'
import SchemaAnswerFields from '@/components/forms/SchemaAnswerFields.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import type { FormDetail } from '@/features/forms/api'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'
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

async function saveDraft(draft: FormAnswerDraft) {
  const savedAnswer = await saveAnswer(draft)
  return savedAnswer ? { answer: savedAnswer } : null
}
</script>

<template>
  <AnswerFormEditor
    :questions="form.questions"
    :answer="answer"
    :disabled="disabled"
    :save-answer="saveDraft"
    legacy-body
    class="space-y-6"
    @update:dirty="emit('update:dirty', $event)"
    v-slot="{ schema, form: answerForm }"
  >
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
  </AnswerFormEditor>
</template>
