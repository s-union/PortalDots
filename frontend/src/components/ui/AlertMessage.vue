<script setup lang="ts">
import { cn } from '@/lib/ui/cn'
import { alertVariants, type AlertVariantProps } from '@/lib/ui/variants'

const { tone = 'danger', class: className } = defineProps<{
  tone?: AlertVariantProps['tone']
  class?: string
}>()
</script>

<template>
  <p :class="cn(alertVariants({ tone }), className)">
    <slot />
  </p>
</template>
