<script setup lang="ts">
const model = defineModel<boolean>()

defineProps<{
  label: string
  disabled?: boolean
}>()
</script>

<template>
  <label class="flex items-center gap-3 text-sm text-body">
    <input v-model="model" :disabled="disabled" type="checkbox" />
    {{ label }}
  </label>
</template>
