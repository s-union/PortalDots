<script setup lang="ts">
import { computed } from 'vue'

const { numberMin, numberMax } = defineProps<{
  name: string
  description: string
  isRequired: boolean
  numberMin: number | null
  numberMax: number | null
}>()

const MAX_NUMBER_SELECT_OPTIONS = 200

const numberOptions = computed(() => {
  if (numberMin === null || numberMax === null || numberMin > numberMax) {
    return null
  }
  const count = numberMax - numberMin + 1
  if (count > MAX_NUMBER_SELECT_OPTIONS) {
    return null
  }
  return Array.from({ length: count }, (_, index) => numberMin + index)
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
    v-if="numberOptions !== null"
    :aria-label="`${name || '整数入力'}のプレビュー`"
    class="w-full rounded border border-border bg-form-control px-3 py-2 text-sm text-muted"
    disabled
    tabindex="-1"
  >
    <option v-for="option in numberOptions" :key="option" :value="option">{{ option }}</option>
  </select>
  <p
    v-else-if="numberMin !== null && numberMax !== null && numberMax - numberMin + 1 > MAX_NUMBER_SELECT_OPTIONS"
    class="text-xs text-muted"
  >
    選択肢数（{{ numberMax - numberMin + 1 }} 件）が上限（{{ MAX_NUMBER_SELECT_OPTIONS }}
    件）を超えています。最低数・最大数の範囲を狭めてください。
  </p>
  <p v-else class="text-xs text-muted">最低数・最大数を設定してください</p>
</template>
