<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const {
  tag = 'div',
  spacious = false,
  class: className
} = defineProps<{
  tag?: string
  spacious?: boolean
  class?: string
}>()
</script>

<template>
  <component :is="tag" :class="cn('px-5 py-5 sm:px-7 sm:py-6', spacious && 'sm:py-7', className)">
    <slot />
  </component>
</template>
