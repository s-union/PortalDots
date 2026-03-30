<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const {
  borderless,
  ignoreMainPadding,
  class: className
} = defineProps<{
  borderless?: boolean
  ignoreMainPadding?: boolean
  class?: string
}>()
</script>

<template>
  <div
    :class="
      cn(
        'px-6 py-5',
        ignoreMainPadding && 'max-[1000px]:-mx-4 max-[1000px]:px-[calc(1.5rem+1rem)]',
        !borderless && 'border-b border-border',
        className
      )
    "
  >
    <slot />
  </div>
</template>
