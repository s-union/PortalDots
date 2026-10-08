<script setup lang="ts">
import type { FieldControl } from '@/components/forms/field-control'
const model = defineModel<boolean>()

const { label, disabled, name, id, ariaInvalid, ariaDescribedBy, control } = defineProps<{
  label: string
  disabled?: boolean
  name?: string
  id?: string
  control?: FieldControl
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}>()
</script>

<template>
  <label class="flex items-center gap-3 text-base text-body">
    <input
      v-bind="control"
      :id="id ?? control?.id"
      v-model="model"
      :aria-describedby="ariaDescribedBy ?? control?.['aria-describedby']"
      :aria-invalid="control?.['aria-invalid'] ?? ariaInvalid"
      :disabled="disabled"
      :name="name"
      type="checkbox"
    />
    {{ label }}
  </label>
</template>
