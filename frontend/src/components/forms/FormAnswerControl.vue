<script setup lang="ts">
import { computed } from 'vue'
import CheckboxAnswerControl from './CheckboxAnswerControl.vue'
import TextAnswerControl from './TextAnswerControl.vue'
import UploadAnswerControl from './UploadAnswerControl.vue'
import type { FormAnswer } from '@/features/forms/answers'
import type { AnswerFormElement } from '@/features/forms/answer-form-schema'

const props = defineProps<{
  answer: FormAnswer | null | undefined
  element: Exclude<AnswerFormElement, { control: 'heading' }>
  disabled?: boolean
  selectedFile?: File | null
  uploadButtonLabel?: string
  uploadPending?: boolean
  uploadErrorMessage?: string
  downloadLabel?: string
  downloadHref: (questionId: string) => string
}>()

const model = defineModel<string | string[]>({ required: true })
const emit = defineEmits<{
  upload: [questionId: string]
  fileChange: [questionId: string, file: File | null]
}>()

// Adapt the flat draft used by existing pages at the boundary to typed controls.
const text = computed({
  get: () => (typeof model.value === 'string' ? model.value : ''),
  set: (value: string | undefined) => (model.value = value ?? '')
})
const choices = computed({
  get: () => (Array.isArray(model.value) ? model.value : []),
  set: (value: string[]) => (model.value = value)
})
</script>

<template>
  <UploadAnswerControl
    v-if="props.element.control === 'upload'"
    v-bind="props"
    :element="props.element"
    @upload="emit('upload', $event)"
    @file-change="(questionId, file) => emit('fileChange', questionId, file)"
  />
  <CheckboxAnswerControl
    v-else-if="props.element.control === 'checkbox'"
    v-model="choices"
    :element="props.element"
    :disabled="props.disabled"
  />
  <TextAnswerControl v-else v-model="text" :element="props.element" :disabled="props.disabled" />
</template>
