<script setup lang="ts">
const model = defineModel<boolean>()

const { label, disabled, name } = defineProps<{
  label: string
  disabled?: boolean
  name?: string
}>()
</script>

<template>
  <label class="flex items-center gap-3 text-sm text-body">
    <input v-model="model" :disabled="disabled" :name="name" type="checkbox" />
    {{ label }}
  </label>
</template>
