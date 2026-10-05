<script setup lang="ts">
import type { FieldElementProps } from '@formisch/vue'
import type { CheckboxAnswerFormElement } from '@/features/forms/answer-form-schema'

const { element, disabled, fieldProps, ariaInvalid, ariaDescribedBy } = defineProps<{
  element: CheckboxAnswerFormElement
  disabled?: boolean
  fieldProps?: FieldElementProps
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}>()

const model = defineModel<string[]>({ required: true })
</script>

<template>
  <div
    :id="element.id"
    class="grid gap-2"
    role="group"
    :aria-label="element.label"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
  >
    <label v-for="option in element.options" :key="option" class="flex items-center gap-3 text-base text-body">
      <input
        v-bind="fieldProps"
        v-model="model"
        :disabled="disabled"
        type="checkbox"
        :name="element.id"
        :value="option"
      />
      <span>{{ option }}</span>
    </label>
  </div>
</template>
