<script setup lang="ts">
const model = defineModel<boolean>()

const { label, disabled, name, id, ariaInvalid, ariaDescribedBy } = defineProps<{
  label: string
  disabled?: boolean
  name?: string
  id?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}>()
</script>

<template>
  <label class="flex items-center gap-3 text-sm text-body">
    <input
      :id="id"
      v-model="model"
      :aria-describedby="ariaDescribedBy"
      :aria-invalid="ariaInvalid"
      :disabled="disabled"
      :name="name"
      type="checkbox"
    />
    {{ label }}
  </label>
</template>
