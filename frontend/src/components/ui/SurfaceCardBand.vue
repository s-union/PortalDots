<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const { borderless, class: className } = defineProps<{
  borderless?: boolean
  class?: string
}>()
</script>

<template>
  <div :class="cn('px-6 py-5', !borderless && 'border-b border-border', className)">
    <slot />
  </div>
</template>
