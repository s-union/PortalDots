<script setup lang="ts">
import { computed } from 'vue'

const { currentStep, requiresMemberStep } = defineProps<{
  currentStep: 1 | 2 | 3
  requiresMemberStep: boolean
}>()

const visibleSteps = computed(() =>
  [
    { key: 'detail', step: 1 as const, label: '企画情報' },
    { key: 'members', step: 2 as const, label: 'メンバー' },
    { key: 'confirm', step: 3 as const, label: '提出' }
  ]
    .filter((item) => item.step !== 2 || requiresMemberStep)
    .map((item, index) => ({
      ...item,
      order: index + 1
    }))
)
</script>

<template>
  <ol
    class="relative flex w-full justify-between before:absolute before:top-3 before:left-0 before:right-0 before:h-px before:bg-border before:content-['']"
  >
    <li v-for="step in visibleSteps" :key="step.key" class="relative flex flex-col items-center gap-2">
      <span
        class="relative z-10 flex size-6 items-center justify-center rounded-full border text-xs font-bold"
        :class="
          step.step === currentStep ? 'border-primary bg-primary text-white' : 'border-muted-2 bg-surface text-muted'
        "
      >
        {{ step.order }}
      </span>
      <span class="text-xs" :class="step.step === currentStep ? 'font-bold text-body' : 'text-muted'">
        {{ step.label }}
      </span>
    </li>
  </ol>
</template>
