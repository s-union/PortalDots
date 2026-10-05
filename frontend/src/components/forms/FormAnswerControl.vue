<script setup lang="ts">
import { computed, type ComponentPublicInstance } from 'vue'
import { buttonVariants } from '@/lib/ui/variants'
import { formatDateTime } from '@/lib/format/datetime'
import { questionUploads, type FormAnswer } from '@/features/forms/answers'
import type { AnswerFormElement } from '@/features/forms/answer-form-schema'
import ErrorState from '@/components/ui/ErrorState.vue'
import FileUploadField from '@/components/ui/FileUploadField.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'

const {
  answer,
  element,
  disabled,
  selectedFile = null,
  uploadButtonLabel = 'アップロード',
  uploadPending = false,
  uploadErrorMessage,
  downloadLabel,
  downloadHref,
  ariaInvalid,
  ariaDescribedBy,
  registerInput
} = defineProps<{
  answer: FormAnswer | null | undefined
  element: Exclude<AnswerFormElement, { control: 'heading' }>
  disabled?: boolean
  selectedFile?: File | null
  uploadButtonLabel?: string
  uploadPending?: boolean
  uploadErrorMessage?: string
  downloadLabel?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  registerInput?: (input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => void
  downloadHref: (questionId: string) => string
}>()

const model = defineModel<string | string[]>({ required: true })

const emit = defineEmits<{
  upload: [questionId: string]
  fileChange: [questionId: string, file: File | null]
}>()

// Bridges FileUploadField's v-model to the props-down/events-up contract with the parent,
// which owns the per-element selected file state.
const selectedFileModel = computed<File | null>({
  get: () => selectedFile,
  set: (file) => emit('fileChange', element.id, file)
})

function toggleCheckboxValue(option: string, checked: boolean) {
  const currentOptions = Array.isArray(model.value) ? [...model.value] : []
  if (checked) {
    if (!currentOptions.includes(option)) {
      currentOptions.push(option)
    }
  } else {
    model.value = currentOptions.filter((currentOption) => currentOption !== option)
    return
  }

  model.value = currentOptions
}

function isChecked(option: string) {
  return Array.isArray(model.value) && model.value.includes(option)
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

function setInputRef(input: Element | ComponentPublicInstance | null) {
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
    registerInput?.(input)
  }
}
</script>

<template>
  <input
    v-if="element.control === 'text'"
    :ref="registerInput && setInputRef"
    :value="String(model)"
    :disabled="disabled"
    :id="element.id"
    :name="element.id === 'legacy-body' ? 'answer-body' : element.id"
    :aria-label="element.label"
    :aria-required="element.required"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
    type="text"
    @input="model = eventTargetValue($event)"
  />

  <textarea
    v-else-if="element.control === 'textarea'"
    :ref="registerInput && setInputRef"
    :value="String(model)"
    :id="element.id"
    :name="element.id === 'legacy-body' ? 'answer-body' : element.id"
    :aria-label="element.label"
    :aria-required="element.required"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
    :class="element.id === 'legacy-body' ? 'min-h-40' : 'min-h-32'"
    :placeholder="element.placeholder"
    :disabled="disabled"
    @input="model = eventTargetValue($event)"
  />

  <MarkdownEditorField
    v-else-if="element.control === 'markdown'"
    :model-value="String(model)"
    :disabled="disabled"
    :id="element.id"
    :name="element.id"
    :aria-invalid="ariaInvalid"
    :aria-described-by="ariaDescribedBy"
    :register-input="registerInput"
    min-height-class="min-h-32"
    @update:model-value="model = $event"
  />

  <input
    v-else-if="element.control === 'number'"
    :ref="registerInput && setInputRef"
    :value="String(model)"
    :disabled="disabled"
    :id="element.id"
    :name="element.id === 'legacy-body' ? 'answer-body' : element.id"
    :aria-label="element.label"
    :aria-required="element.required"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
    type="number"
    :min="element.min ?? undefined"
    :max="element.max ?? undefined"
    @input="model = eventTargetValue($event)"
  />

  <select
    v-else-if="element.control === 'select'"
    :ref="registerInput && setInputRef"
    :value="String(model)"
    :disabled="disabled"
    :id="element.id"
    :name="element.id === 'legacy-body' ? 'answer-body' : element.id"
    :aria-label="element.label"
    :aria-required="element.required"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
    @change="model = eventTargetValue($event)"
  >
    <option value="">選択してください</option>
    <option v-for="option in element.options" :key="option" :value="option">
      {{ option }}
    </option>
  </select>

  <div
    v-else-if="element.control === 'radio'"
    class="grid gap-2"
    role="radiogroup"
    :aria-label="element.label"
    :aria-required="element.required"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
  >
    <label v-for="option in element.options" :key="option" class="flex items-center gap-3 text-base text-body">
      <input
        :checked="String(model) === option"
        :ref="registerInput && setInputRef"
        :disabled="disabled"
        type="radio"
        :name="element.id"
        :value="option"
        @change="model = option"
      />
      <span>{{ option }}</span>
    </label>
  </div>

  <div
    v-else-if="element.control === 'checkbox'"
    class="grid gap-2"
    role="group"
    :aria-label="element.label"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
  >
    <label v-for="option in element.options" :key="option" class="flex items-center gap-3 text-base text-body">
      <input
        :checked="isChecked(option)"
        :ref="registerInput && setInputRef"
        :disabled="disabled"
        type="checkbox"
        :name="element.id"
        :value="option"
        @change="toggleCheckboxValue(option, eventTargetChecked($event))"
      />
      <span>{{ option }}</span>
    </label>
  </div>

  <div v-else-if="element.control === 'upload'" class="grid gap-4">
    <div v-if="questionUploads(answer, element.id).length === 0" class="text-base text-muted">
      まだファイルはアップロードされていません。
    </div>
    <ul v-else class="grid gap-3">
      <li
        v-for="upload in questionUploads(answer, element.id)"
        :key="upload.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-form-control px-4 py-3 text-base text-body"
      >
        <div>
          <p>{{ upload.filename }}</p>
          <p class="mt-1 text-xs text-muted">
            {{ upload.mimeType }} / {{ upload.sizeBytes }} bytes /
            {{ formatDateTime(upload.createdAt) }}
          </p>
        </div>
        <a :href="downloadHref(element.id)" :class="buttonVariants({ variant: 'secondary', size: 'xs' })">
          {{ downloadLabel ?? '表示' }}
        </a>
      </li>
    </ul>

    <div class="grid gap-3 min-[1001px]:grid-cols-[1fr_auto]">
      <FileUploadField
        v-model="selectedFileModel"
        :aria-label="element.label + 'のアップロード'"
        :disabled="disabled"
        :extensions="element.extensions"
        :id="element.id"
        :max-size-bytes="element.maxSizeBytes"
        :name="`answer-file-${element.id}`"
      />
      <button
        :class="buttonVariants({ variant: 'secondary', size: 'md' })"
        :disabled="disabled || uploadPending"
        type="button"
        @click="emit('upload', element.id)"
      >
        {{ uploadPending ? '送信中...' : uploadButtonLabel }}
      </button>
    </div>

    <ErrorState v-if="uploadErrorMessage" :message="uploadErrorMessage" />
  </div>
</template>
