<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants, type ButtonVariantProps } from '@/lib/ui/variants'

const {
  to,
  href,
  type = 'button',
  variant = 'secondary',
  size = 'md',
  weight = 'normal',
  fullWidth = false,
  disabled,
  target,
  rel,
  class: className
} = defineProps<{
  to?: string
  href?: string
  type?: 'button' | 'submit' | 'reset'
  variant?: ButtonVariantProps['variant']
  size?: ButtonVariantProps['size']
  weight?: ButtonVariantProps['weight']
  fullWidth?: boolean
  disabled?: boolean
  target?: string
  rel?: string
  class?: string
}>()

const component = computed(() => {
  if (to) {
    return 'RouterLink'
  }
  if (href) {
    return 'a'
  }
  return 'button'
})

const extraProps = computed(() => {
  if (to) {
    return { to }
  }
  if (href) {
    const props: Record<string, string | undefined> = { href }
    if (target) {
      props.target = target
    }
    if (rel) {
      props.rel = rel
    }
    return props
  }
  return { type }
})
</script>

<template>
  <component
    :is="component"
    v-bind="extraProps"
    :disabled="component === 'button' ? disabled : undefined"
    :class="cn(buttonVariants({ variant, size, weight, fullWidth }), className)"
  >
    <slot />
  </component>
</template>
