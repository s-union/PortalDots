<script setup lang="ts">
import { buildStaffFormUploadDownloadUrl, type StaffFormUpload } from '@/features/staff/forms/api'

const {
  formId,
  upload,
  variant = 'default'
} = defineProps<{
  formId: string
  upload: StaffFormUpload
  variant?: 'default' | 'highlight'
}>()

const containerClasses =
  variant === 'highlight'
    ? 'flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface-light px-4 py-3 text-sm text-body'
    : 'flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface px-4 py-3 text-sm text-body'

const downloadClasses =
  variant === 'highlight'
    ? 'rounded border border-border px-4 py-2 text-xs text-body transition hover:bg-surface'
    : 'rounded border border-border px-4 py-2 text-xs text-body transition hover:bg-surface-light'
</script>

<template>
  <div :class="containerClasses">
    <div>
      <p>{{ upload.filename }}</p>
      <p class="mt-1 text-xs text-muted-2">
        {{ upload.mimeType }} / {{ upload.sizeBytes }} bytes / {{ upload.createdAt }}
      </p>
    </div>
    <a :href="buildStaffFormUploadDownloadUrl(formId, upload.id)" :class="downloadClasses"> ダウンロード </a>
  </div>
</template>
