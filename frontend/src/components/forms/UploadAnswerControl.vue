<script setup lang="ts">
import { computed } from 'vue'
import { buttonVariants } from '@/lib/ui/variants'
import { formatDateTime } from '@/lib/format/datetime'
import { questionUploads, type FormAnswer } from '@/features/forms/answers'
import type { UploadAnswerElement } from '@/features/forms/answer-form-schema'
import ErrorState from '@/components/ui/ErrorState.vue'
import FileUploadField from '@/components/ui/FileUploadField.vue'

const {
  answer,
  element,
  disabled,
  selectedFile = null,
  uploadButtonLabel = 'アップロード',
  uploadPending = false,
  uploadErrorMessage,
  downloadLabel,
  downloadHref
} = defineProps<{
  answer: FormAnswer | null | undefined
  element: UploadAnswerElement
  disabled?: boolean
  selectedFile?: File | null
  uploadButtonLabel?: string
  uploadPending?: boolean
  uploadErrorMessage?: string
  downloadLabel?: string
  downloadHref: (questionId: string) => string
}>()

const emit = defineEmits<{
  upload: [questionId: string]
  fileChange: [questionId: string, file: File | null]
}>()

const selectedFileModel = computed<File | null>({
  get: () => selectedFile,
  set: (file) => emit('fileChange', element.id, file)
})
</script>

<template>
  <div class="grid gap-4">
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
