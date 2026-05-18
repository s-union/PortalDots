<script setup lang="ts">
defineProps<{
  name: string
  description: string
  isRequired: boolean
  type: 'text' | 'number'
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
  <input
    class="w-full rounded border border-border bg-form-control px-3 py-2 text-sm text-muted"
    :type="type"
    :placeholder="type === 'number' ? '整数入力' : '一行入力'"
    disabled
    readonly
    tabindex="-1"
  />
</template>
