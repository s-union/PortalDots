<script setup lang="ts">
import { cn } from '@/lib/ui/cn'
import { formControlVariants } from '@/lib/ui/variants'

const { hasError } = defineProps<{
  hasError?: boolean
}>()

const model = defineModel<string>()
</script>

<template>
  <textarea v-model="model" :class="cn('min-h-24', formControlVariants({ hasError }))" />
</template>
