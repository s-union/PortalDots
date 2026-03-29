<script setup lang="ts">
import { computed } from 'vue'

const { currentStep, requiresMemberStep } = defineProps<{
  currentStep: 1 | 2 | 3
  requiresMemberStep: boolean
}>()

const steps = computed(() => [
  { number: 1 as const, label: '企画情報', show: true },
  { number: 2 as const, label: 'メンバー', show: requiresMemberStep },
  { number: 3 as const, label: '提出', show: true }
])
</script>

<template>
  <ol
    class="relative flex w-full justify-between before:absolute before:top-3 before:left-0 before:right-0 before:h-px before:bg-border before:content-['']"
  >
    <li v-for="step in steps" v-show="step.show" :key="step.number" class="relative flex flex-col items-center gap-2">
      <span
        class="relative z-10 flex size-6 items-center justify-center rounded-full border text-xs font-bold"
        :class="
          step.number === currentStep ? 'border-primary bg-primary text-white' : 'border-muted-2 bg-surface text-muted'
        "
      >
        {{ step.number }}
      </span>
      <span class="text-xs" :class="step.number === currentStep ? 'font-bold text-body' : 'text-muted'">
        {{ step.label }}
      </span>
    </li>
  </ol>
</template>
