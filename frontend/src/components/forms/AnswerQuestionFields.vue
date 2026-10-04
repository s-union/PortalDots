<script setup lang="ts">
import { computed } from 'vue'
import FormAnswerControl from './FormAnswerControl.vue'
import type { FormAnswer } from '@/features/forms/answers'
import type { FormQuestion } from '@/features/forms/api'
import { buildAnswerFormSchema, getAnswerFormElements } from '@/features/forms/answer-form-schema'

const props = defineProps<{
  answer: FormAnswer | null | undefined
  question: FormQuestion
  disabled?: boolean
  selectedFile?: File | null
  uploadButtonLabel?: string
  uploadPending?: boolean
  uploadErrorMessage?: string
  downloadLabel?: string
  downloadHref: (question: FormQuestion) => string
}>()

const model = defineModel<string | string[]>({ required: true })
const emit = defineEmits<{
  upload: [questionId: string]
  fileChange: [questionId: string, file: File | null]
}>()

// Keep the existing per-question API for pages that own their answer draft.
// Control selection still comes from the same schema compiler as Formisch forms.
const element = computed(() => getAnswerFormElements(buildAnswerFormSchema([props.question]))[0])
</script>

<template>
  <FormAnswerControl
    v-if="element && element.control !== 'heading'"
    v-model="model"
    :element="element"
    :answer="answer"
    :disabled="disabled"
    :selected-file="selectedFile"
    :upload-button-label="uploadButtonLabel"
    :upload-pending="uploadPending"
    :upload-error-message="uploadErrorMessage"
    :download-label="downloadLabel"
    :download-href="() => downloadHref(question)"
    @upload="emit('upload', $event)"
    @file-change="(questionId, file) => emit('fileChange', questionId, file)"
  />
</template>
