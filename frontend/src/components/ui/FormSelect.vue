<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const { hasError } = defineProps<{
  hasError?: boolean
}>()

const model = defineModel<string>()
</script>

<template>
  <select
    v-model="model"
    :class="
      cn(
        'rounded border bg-form-control px-4 py-3 text-sm text-body outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30',
        hasError ? 'border-danger' : 'border-border'
      )
    "
  >
    <slot />
  </select>
</template>
