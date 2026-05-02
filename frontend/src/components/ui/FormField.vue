<script setup lang="ts">
import { computed } from 'vue'
import FormError from '@/components/ui/FormError.vue'

const { label, required, helper, error, labelClass, as } = defineProps<{
  label: string
  required?: boolean
  helper?: string
  error?: string | boolean
  labelClass?: string
  as?: 'label' | 'div'
}>()

const errorString = computed(() => (typeof error === 'string' ? error : undefined))
</script>

<template>
  <component :is="as ?? 'label'" class="grid gap-2 text-sm text-body">
    <span :class="labelClass">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </span>
    <span v-if="helper" class="text-xs text-muted">{{ helper }}</span>
    <slot />
    <FormError v-if="errorString" :message="errorString!" />
  </component>
</template>
