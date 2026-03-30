<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const { class: className, size = 'default' } = defineProps<{
  class?: string
  size?: 'default' | 'narrow'
}>()

const sizeClass = {
  default: 'max-w-[1024px]',
  narrow: 'max-w-[880px]'
} as const
</script>

<template>
  <section :class="cn('mx-auto w-full space-y-6 max-[1000px]:px-4', sizeClass[size], className)">
    <slot />
  </section>
</template>
