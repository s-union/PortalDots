<script setup lang="ts">
import { cn } from '@/lib/ui/cn'
import { tagColorClass } from '@/lib/tagColor'

const {
  name,
  color,
  size = 'md',
  class: className
} = defineProps<{
  name: string
  color?: string
  size?: 'sm' | 'md'
  class?: string
}>()
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        tagColorClass(color),
        className
      )
    "
  >
    {{ name }}
  </span>
</template>
