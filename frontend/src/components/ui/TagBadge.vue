<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

defineProps<{
  class?: string
}>()
</script>

<template>
  <span
    :class="cn('inline-flex items-center rounded bg-primary px-2 py-1 text-xs font-semibold text-white', $props.class)"
  >
    <slot />
  </span>
</template>
