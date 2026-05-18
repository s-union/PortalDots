<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const { class: className } = defineProps<{
  class?: string
}>()
</script>

<template>
  <span
    :class="cn('inline-flex items-center rounded bg-primary px-2 py-1 text-xs font-semibold text-white', className)"
  >
    <slot />
  </span>
</template>
