<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const {
  class: className,
  contentClass,
  width = 'md'
} = defineProps<{
  class?: string
  contentClass?: string
  width?: 'sm' | 'md'
}>()

const widthClass = {
  sm: 'max-w-[400px]',
  md: 'max-w-[800px]'
} as const
</script>

<template>
  <section :class="cn('flex min-h-[calc(100dvh-5rem)] flex-col justify-center bg-surface px-6 py-10', className)">
    <div :class="cn('mx-auto w-full', widthClass[width], contentClass)">
      <slot />
    </div>
  </section>
</template>
