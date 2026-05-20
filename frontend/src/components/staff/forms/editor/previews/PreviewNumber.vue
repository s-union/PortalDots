<script setup lang="ts">
import { computed } from 'vue'

const { numberMin, numberMax } = defineProps<{
  name: string
  description: string
  isRequired: boolean
  numberMin: number | null
  numberMax: number | null
}>()

const numberOptions = computed(() => {
  if (numberMin === null || numberMax === null || numberMin > numberMax) {
    return []
  }

  return Array.from({ length: numberMax - numberMin + 1 }, (_, index) => numberMin + index)
})
</script>

<template>
  <div class="mb-2 flex items-center gap-2">
    <span class="font-medium text-body">{{ name || '(無題の設問)' }}</span>
    <span v-if="isRequired" class="rounded bg-danger px-1.5 py-0.5 text-xs font-bold text-white">必須</span>
  </div>
  <p v-if="description" class="mb-2 whitespace-pre-wrap text-sm leading-7 text-muted">
    {{ description }}
  </p>
  <select
    :aria-label="`${name || '整数入力'}のプレビュー`"
    class="w-full rounded border border-border bg-form-control px-3 py-2 text-sm text-muted"
    disabled
    tabindex="-1"
  >
    <option v-if="numberOptions.length === 0">最低数・最大数を設定してください</option>
    <option v-for="option in numberOptions" :key="option" :value="option">{{ option }}</option>
  </select>
</template>
