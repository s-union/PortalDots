<script setup lang="ts">
import type { FieldControl } from '@/components/forms/field-control'
const model = defineModel<boolean>()

const { label, disabled, required, name, id, ariaInvalid, ariaDescribedBy, control } = defineProps<{
  label: string
  disabled?: boolean
  required?: boolean
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
      :required="required"
      type="checkbox"
    />
    {{ label }}
  </label>
</template>
