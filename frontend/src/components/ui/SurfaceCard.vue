<script setup lang="ts">
import { cn } from '@/lib/ui/cn'
import { surfaceVariants, type SurfaceVariantProps } from '@/lib/ui/variants'

const {
  id,
  tag = 'section',
  overflowHidden = false,
  shadow = 'lv1'
} = defineProps<{
  id?: string
  tag?: string
  overflowHidden?: boolean
  shadow?: SurfaceVariantProps['shadow']
}>()
</script>

<template>
  <component :is="tag" :id="id" :class="cn(surfaceVariants({ overflowHidden, shadow }))">
    <slot />
  </component>
</template>
