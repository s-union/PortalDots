<script setup lang="ts">
defineProps<{
  name: string
  description: string
  isRequired: boolean
  allowedTypes: string
}>()
</script>

<template>
  <div class="mb-2 flex items-center gap-2">
    <span class="font-medium text-body">{{ name || '(無題の設問)' }}</span>
    <span v-if="isRequired" class="rounded bg-danger px-1.5 py-0.5 text-xs font-bold text-white">必須</span>
  </div>
  <p v-if="description" class="mb-2 whitespace-pre-wrap text-sm leading-7 text-muted">
    {{ description }}
  </p>
  <div class="rounded border border-dashed border-border bg-form-control px-4 py-5 text-sm text-muted">
    ファイルを選択
    <span v-if="allowedTypes" class="ml-2 text-xs">（{{ allowedTypes }}）</span>
  </div>
</template>
