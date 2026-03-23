<script setup lang="ts">
import { cn } from '@/lib/ui/cn'
import { statusBadgeVariants, type StatusBadgeVariantProps } from '@/lib/ui/variants'

const {
  tone = 'muted',
  appearance = 'filled',
  size = 'md',
  class: className
} = defineProps<{
  tone?: StatusBadgeVariantProps['tone']
  appearance?: StatusBadgeVariantProps['appearance']
  size?: StatusBadgeVariantProps['size']
  class?: string
}>()
</script>

<template>
  <span :class="cn(statusBadgeVariants({ tone, appearance, size }), className)">
    <slot />
  </span>
</template>
