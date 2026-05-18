<script setup lang="ts">
defineProps<{
  name: string
  description: string
  isRequired: boolean
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
  <textarea
    class="min-h-28 w-full rounded border border-border bg-form-control px-3 py-2 text-sm text-muted"
    placeholder="複数行入力"
    disabled
    readonly
    rows="3"
    tabindex="-1"
  />
</template>
