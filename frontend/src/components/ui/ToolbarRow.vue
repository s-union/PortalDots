<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const { class: className } = defineProps<{
  class?: string
}>()
</script>

<template>
  <div :class="cn('flex w-full flex-wrap items-center gap-3', className)">
    <slot />
  </div>
</template>
