<script setup lang="ts">
defineProps<{
  name: string
  description: string
  isRequired: boolean
  options: string[]
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
  <div v-if="options.length > 0" class="grid gap-2">
    <label v-for="option in options" :key="option" class="flex items-center gap-3 text-sm text-body">
      <input disabled type="checkbox" tabindex="-1" />
      <span>{{ option }}</span>
    </label>
  </div>
  <div v-else class="empty-option">
    <p class="font-semibold text-body">選択肢がありません。</p>
    <p class="mt-1 text-sm text-muted">選択肢を1つ以上入力してください。</p>
  </div>
</template>
