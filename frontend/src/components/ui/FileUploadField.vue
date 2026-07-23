<script setup lang="ts">
import { computed, useId, useTemplateRef, watch } from 'vue'
import FormError from '@/components/ui/FormError.vue'
import { formatFileSize } from '@/lib/format/fileSize'

// Selected file: genuinely two-way. The parent may clear it (e.g. after a successful
// submit) and this component updates it when the user picks or removes a file.
const model = defineModel<File | null>({ default: null })
// Combined validation error (client-side check, or the server-provided error when no
// client-side issue is found), exposed so the parent can gate actions on it (e.g. block
// form submission while an invalid file is selected).
const error = defineModel<string>('error', { default: '' })

const {
  extensions,
  maxSizeBytes,
  hint,
  disabled = false,
  name,
  id,
  ariaLabel,
  serverError = '',
  extensionErrorMessage = '許可されていない拡張子です'
} = defineProps<{
  extensions?: string[]
  maxSizeBytes?: number
  hint?: string
  disabled?: boolean
  name?: string
  id?: string
  ariaLabel?: string
  serverError?: string
  extensionErrorMessage?: string
}>()

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const generatedId = useId()
const baseId = computed(() => id ?? generatedId)
const hintId = computed(() => `${baseId.value}-hint`)
const errorId = computed(() => `${baseId.value}-error`)
const normalizedExtensions = computed(
  () =>
    extensions
      ?.map((extension) => extension.trim().toLowerCase().replace(/^\./, ''))
      .filter((extension) => extension !== '') ?? []
)
const uploadDescription = computed(() => {
  if (hint) return hint

  const parts = []
  if (normalizedExtensions.value.length > 0) {
    parts.push(normalizedExtensions.value.join(' / '))
  }
  if (maxSizeBytes !== undefined) {
    parts.push(`1ファイル${formatFileSize(maxSizeBytes)}まで`)
  } else {
    parts.push('1ファイル選択できます')
  }

  return parts.join(' ・')
})
const selectedFiles = computed(() => (model.value ? [model.value] : []))
const canAddFile = computed(() => selectedFiles.value.length === 0)

const clientError = computed(() => {
  const file = model.value
  if (!file) return ''
  if (file.size === 0) return '空のファイルはアップロードできません'
  if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
    return `ファイルサイズは ${formatFileSize(maxSizeBytes)} 以下にしてください`
  }
  if (normalizedExtensions.value.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!normalizedExtensions.value.includes(extension)) {
      return extensionErrorMessage
    }
  }
  return ''
})
const combinedError = computed(() => clientError.value || serverError)

watch(combinedError, (value) => (error.value = value), { immediate: true })

// Keep the native file input in sync when the parent clears the model externally.
watch(model, (file) => {
  if (!file && fileInput.value) {
    fileInput.value.value = ''
  }
})

const describedBy = computed(() => {
  const ids = [uploadDescription.value ? hintId.value : null, error.value ? errorId.value : null].filter(
    (value) => value !== null
  )
  return ids.length > 0 ? ids.join(' ') : undefined
})
const acceptAttribute = computed(() =>
  normalizedExtensions.value.length > 0
    ? normalizedExtensions.value.map((extension) => `.${extension}`).join(',')
    : undefined
)

function handleChange(event: Event) {
  if (!(event.currentTarget instanceof HTMLInputElement)) return
  model.value = event.currentTarget.files?.[0] ?? null
}

function handleDrop(event: DragEvent) {
  if (disabled) return
  model.value = event.dataTransfer?.files?.[0] ?? null
}

function openFileDialog() {
  if (disabled) return
  fileInput.value?.click()
}

function removeFile() {
  if (disabled) return
  model.value = null
}
</script>

<template>
  <div class="grid gap-2">
    <input
      ref="fileInput"
      :accept="acceptAttribute"
      :aria-describedby="describedBy"
      :aria-invalid="error ? 'true' : undefined"
      :aria-label="ariaLabel"
      class="sr-only"
      :disabled="disabled"
      :name="name"
      type="file"
      @change="handleChange"
    />
    <div
      v-if="canAddFile"
      :class="[
        'grid min-h-40 place-items-center rounded border border-dashed border-border bg-surface-light px-4 py-5 text-center transition-colors',
        error ? 'border-danger' : '',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-primary'
      ]"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <div class="grid min-w-0 justify-items-center gap-2">
        <p class="mb-0 text-sm text-body">ここにファイルをドロップ</p>
        <p class="mb-0 text-xs text-muted-2">または</p>
        <button
          class="rounded border border-border bg-surface px-4 py-2 text-sm font-medium text-body shadow-sm transition-colors hover:bg-surface-light disabled:cursor-not-allowed disabled:text-muted-2"
          :disabled="disabled"
          type="button"
          @click="openFileDialog"
        >
          ファイルを選択
        </button>
        <p :id="hintId" class="text-xs leading-4 text-muted-2">{{ uploadDescription }}</p>
      </div>
    </div>
    <div
      v-for="file in selectedFiles"
      :key="`${file.name}-${file.size}-${file.lastModified}`"
      class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded border border-border bg-surface px-4 py-3 text-sm max-[480px]:grid-cols-1"
    >
      <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {{ file.name }}（{{ formatFileSize(file.size) }}）
      </span>
      <button class="justify-self-start text-primary underline" :disabled="disabled" type="button" @click="removeFile">
        選択を解除
      </button>
    </div>
    <FormError v-if="error" :id="errorId" :message="error" />
  </div>
</template>
