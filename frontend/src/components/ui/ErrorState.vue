<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const {
  message,
  compact = false,
  class: className
} = defineProps<{
  message: string
  compact?: boolean
  class?: string
}>()
</script>

<template>
  <div
    :class="
      cn(
        'rounded border border-danger bg-danger-light text-danger',
        compact ? 'px-4 py-3 text-sm' : 'px-6 py-5',
        className
      )
    "
  >
    {{ message }}
  </div>
</template>
