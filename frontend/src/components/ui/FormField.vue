<script setup lang="ts">
const props = defineProps<{
  label: string
  required?: boolean
  helper?: string
  error?: string | boolean
  labelClass?: string
  as?: 'label' | 'div'
}>()

function errorMessage(): string | undefined {
  if (typeof props.error === 'string') return props.error
  return undefined
}
</script>

<template>
  <component :is="as ?? 'label'" class="grid gap-2 text-sm text-body">
    <span :class="labelClass">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </span>
    <span v-if="helper" class="text-xs text-muted">{{ helper }}</span>
    <slot />
    <FormError v-if="errorMessage()" :message="errorMessage()!" />
  </component>
</template>
