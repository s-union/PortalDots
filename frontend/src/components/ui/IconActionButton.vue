<script setup lang="ts">
import { cn } from '@/lib/ui/cn'
import { iconButtonVariants, type IconButtonVariantProps } from '@/lib/ui/variants'

const {
  type = 'button',
  variant = 'ghost',
  size = 'sm',
  title,
  ariaLabel,
  class: className
} = defineProps<{
  type?: 'button' | 'submit' | 'reset'
  variant?: IconButtonVariantProps['variant']
  size?: IconButtonVariantProps['size']
  title?: string
  ariaLabel?: string
  class?: string
}>()
</script>

<template>
  <button
    :type="type"
    :title="title"
    :aria-label="ariaLabel ?? title"
    :class="cn(iconButtonVariants({ variant, size }), className)"
  >
    <slot />
  </button>
</template>
