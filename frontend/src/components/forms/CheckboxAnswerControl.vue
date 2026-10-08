<script setup lang="ts">
import type { FieldElementProps } from '@formisch/vue'
import { computed, nextTick, useTemplateRef } from 'vue'
import type { CheckboxAnswerFormElement } from '@/features/forms/answer-form-schema'

const { element, disabled, fieldProps, ariaInvalid, ariaDescribedBy } = defineProps<{
  element: CheckboxAnswerFormElement
  disabled?: boolean
  fieldProps?: FieldElementProps
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}>()

const model = defineModel<string[]>({ required: true })
const group = useTemplateRef<HTMLDivElement>('group')
const control = computed(() => ({ ...fieldProps, 'data-field-path': fieldProps?.name }))
const visibleOptions = computed(() => [
  ...element.options,
  ...model.value.filter((value) => !element.options.includes(value))
])

async function handleChange(event: Event) {
  const input = event.currentTarget
  if (
    !(input instanceof HTMLInputElement) ||
    input.checked ||
    element.options.includes(input.value) ||
    !input.matches(':focus')
  )
    return
  // Removing an obsolete option removes its control; keep keyboard focus within the group.
  await nextTick()
  group.value?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus()
}
</script>

<template>
  <div ref="group" :id="element.id" class="grid gap-2">
    <label v-for="option in visibleOptions" :key="option" class="flex items-center gap-3 text-base text-body">
      <input
        v-bind="control"
        v-model="model"
        :disabled="disabled"
        type="checkbox"
        :name="element.id"
        :value="option"
        :aria-invalid="ariaInvalid"
        :aria-describedby="ariaDescribedBy"
        @change="handleChange"
      />
      <span>{{ option }}{{ element.options.includes(option) ? '' : '（現在は選べません）' }}</span>
    </label>
  </div>
</template>
