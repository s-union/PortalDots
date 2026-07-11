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

const clientError = computed(() => {
  const file = model.value
  if (!file) return ''
  if (file.size === 0) return '空のファイルはアップロードできません'
  if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
    return `ファイルサイズは ${formatFileSize(maxSizeBytes)} 以下にしてください`
  }
  if (extensions && extensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!extensions.includes(extension)) {
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
  const ids = [hint ? hintId.value : null, error.value ? errorId.value : null].filter((value) => value !== null)
  return ids.length > 0 ? ids.join(' ') : undefined
})
const acceptAttribute = computed(() =>
  extensions && extensions.length > 0 ? extensions.map((extension) => `.${extension}`).join(',') : undefined
)

function handleChange(event: Event) {
  if (!(event.currentTarget instanceof HTMLInputElement)) return
  model.value = event.currentTarget.files?.[0] ?? null
}

function removeFile() {
  model.value = null
}
</script>

<template>
  <div class="grid gap-2">
    <p v-if="hint" :id="hintId" class="text-xs leading-6 text-muted-2">{{ hint }}</p>
    <input
      ref="fileInput"
      :accept="acceptAttribute"
      :aria-describedby="describedBy"
      :aria-invalid="error ? 'true' : undefined"
      :aria-label="ariaLabel"
      :class="{ 'border-danger': error }"
      :disabled="disabled"
      :name="name"
      type="file"
      @change="handleChange"
    />
    <div
      v-if="model"
      class="flex items-center justify-between gap-3 rounded border border-border bg-surface-light px-4 py-3 text-sm"
    >
      <span class="min-w-0 truncate">{{ model.name }}（{{ formatFileSize(model.size) }}）</span>
      <button class="shrink-0 text-primary underline" :disabled="disabled" type="button" @click="removeFile">
        選択を解除
      </button>
    </div>
    <FormError v-if="error" :id="errorId" :message="error" />
  </div>
</template>
