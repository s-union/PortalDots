<script setup lang="ts">
import { buttonVariants } from '@/lib/ui/variants'
import { formatDateTime } from '@/lib/format/datetime'
import {
  answerValue,
  createAnswerableQuestionRef,
  questionUploads,
  setAnswerValue,
  type FormAnswer,
  type FormAnswerDraft
} from '@/features/forms/answers'
import type { FormQuestion } from '@/features/forms/api'
import ErrorState from '@/components/ui/ErrorState.vue'

const {
  answer,
  draft,
  question,
  disabled,
  uploadButtonLabel,
  uploadPending,
  uploadErrorMessage,
  downloadLabel,
  downloadHref
} = defineProps<{
  answer: FormAnswer | null | undefined
  draft: FormAnswerDraft
  question: FormQuestion
  disabled?: boolean
  uploadButtonLabel: string
  uploadPending?: boolean
  uploadErrorMessage?: string
  downloadLabel?: string
  downloadHref: (question: FormQuestion) => string
}>()

const emit = defineEmits<{
  upload: [questionId: string]
  fileChange: [questionId: string, event: Event]
}>()

function toggleCheckboxValue(option: string, checked: boolean) {
  const currentValue = draftValue()
  const currentOptions = Array.isArray(currentValue) ? [...currentValue] : []
  if (checked) {
    if (!currentOptions.includes(option)) {
      currentOptions.push(option)
    }
  } else {
    const nextOptions = currentOptions.filter((currentOption) => currentOption !== option)
    setAnswerValue(draft, createAnswerableQuestionRef(question.id, 'checkbox'), nextOptions)
    return
  }

  setAnswerValue(draft, createAnswerableQuestionRef(question.id, 'checkbox'), currentOptions)
}

function isChecked(option: string) {
  const currentValue = draftValue()
  return Array.isArray(currentValue) && currentValue.includes(option)
}

function draftValue() {
  return answerValue(draft, question)
}

function eventTargetValue(event: Event) {
  const target = event.target
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
    ? target.value
    : ''
}

function eventTargetChecked(event: Event) {
  const target = event.target
  return target instanceof HTMLInputElement ? target.checked : false
}
</script>

<template>
  <input
    v-if="question.type === 'text'"
    :value="String(draftValue())"
    :disabled="disabled"
    :aria-label="question.name"
    type="text"
    @input="setAnswerValue(draft, question, eventTargetValue($event))"
  />

  <textarea
    v-else-if="question.type === 'textarea'"
    :value="String(draftValue())"
    :aria-label="question.name"
    class="min-h-32"
    :disabled="disabled"
    @input="setAnswerValue(draft, question, eventTargetValue($event))"
  />

  <input
    v-else-if="question.type === 'number'"
    :value="String(draftValue())"
    :disabled="disabled"
    :aria-label="question.name"
    type="number"
    :min="question.numberMin ?? undefined"
    :max="question.numberMax ?? undefined"
    @input="setAnswerValue(draft, question, eventTargetValue($event))"
  />

  <select
    v-else-if="question.type === 'select'"
    :value="String(draftValue())"
    :disabled="disabled"
    :aria-label="question.name"
    @change="setAnswerValue(draft, question, eventTargetValue($event))"
  >
    <option value="">選択してください</option>
    <option v-for="option in question.options" :key="option" :value="option">
      {{ option }}
    </option>
  </select>

  <div v-else-if="question.type === 'radio'" class="grid gap-2">
    <label v-for="option in question.options" :key="option" class="flex items-center gap-3 text-sm text-body">
      <input
        :checked="String(draftValue()) === option"
        :disabled="disabled"
        type="radio"
        :name="question.id"
        :value="option"
        @change="setAnswerValue(draft, question, option)"
      />
      <span>{{ option }}</span>
    </label>
  </div>

  <div v-else-if="question.type === 'checkbox'" class="grid gap-2">
    <label v-for="option in question.options" :key="option" class="flex items-center gap-3 text-sm text-body">
      <input
        :checked="isChecked(option)"
        :disabled="disabled"
        type="checkbox"
        @change="toggleCheckboxValue(option, eventTargetChecked($event))"
      />
      <span>{{ option }}</span>
    </label>
  </div>

  <div v-else-if="question.type === 'upload'" class="grid gap-4">
    <div v-if="questionUploads(answer, question.id).length === 0" class="text-sm text-muted">
      まだファイルはアップロードされていません。
    </div>
    <ul v-else class="grid gap-3">
      <li
        v-for="upload in questionUploads(answer, question.id)"
        :key="upload.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
      >
        <div>
          <p>{{ upload.filename }}</p>
          <p class="mt-1 text-xs text-muted">
            {{ upload.mimeType }} / {{ upload.sizeBytes }} bytes /
            {{ formatDateTime(upload.createdAt) }}
          </p>
        </div>
        <a :href="downloadHref(question)" :class="buttonVariants({ variant: 'secondary', size: 'xs' })">
          {{ downloadLabel ?? '表示' }}
        </a>
      </li>
    </ul>

    <div class="grid gap-3 min-[1001px]:grid-cols-[1fr_auto]">
      <input
        :disabled="disabled"
        :name="`answer-file-${question.id}`"
        :aria-label="question.name + 'のアップロード'"
        type="file"
        @change="emit('fileChange', question.id, $event)"
      />
      <button
        :class="buttonVariants({ variant: 'secondary', size: 'md' })"
        :disabled="disabled || uploadPending"
        type="button"
        @click="emit('upload', question.id)"
      >
        {{ uploadPending ? '送信中...' : uploadButtonLabel }}
      </button>
    </div>

    <ErrorState v-if="uploadErrorMessage" :message="uploadErrorMessage" />
  </div>
</template>
