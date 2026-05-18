<script setup lang="ts">
import { formControlVariants } from '@/lib/ui/variants'

const { hasError } = defineProps<{
  hasError?: boolean
}>()

const model = defineModel<string>()
</script>

<template>
  <input v-model="model" :class="formControlVariants({ hasError })" />
</template>
