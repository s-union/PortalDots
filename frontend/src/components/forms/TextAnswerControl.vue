<script setup lang="ts">
import type { FieldElementProps } from '@formisch/vue'
import { computed } from 'vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import type { TextAnswerFormElement } from '@/features/forms/answer-form-schema'

const { element, disabled, fieldProps, ariaInvalid, ariaDescribedBy } = defineProps<{
  element: TextAnswerFormElement
  disabled?: boolean
  fieldProps?: FieldElementProps
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}>()

const model = defineModel<string | undefined>({ required: true })
const text = computed({ get: () => model.value ?? '', set: (value: string) => (model.value = value) })
const name = computed(() => (element.id === 'legacy-body' ? 'answer-body' : element.id))
const control = computed(() => ({ ...fieldProps, 'data-field-path': fieldProps?.name }))
const unavailableSelection = computed(() =>
  (element.control === 'select' || element.control === 'radio') &&
  text.value !== '' &&
  !element.options.includes(text.value)
    ? text.value
    : undefined
)

function updateNumber(event: Event) {
  // Native v-model on type="number" coerces to number; the API stores numeric answers as strings.
  if (event.target instanceof HTMLInputElement) model.value = event.target.value
}
</script>

<template>
  <input
    v-if="element.control === 'text'"
    v-bind="control"
    v-model="text"
    :id="element.id"
    :name="name"
    :disabled="disabled"
    :aria-label="element.label"
    :aria-required="element.required"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
    type="text"
  />

  <textarea
    v-else-if="element.control === 'textarea'"
    v-bind="control"
    v-model="text"
    :id="element.id"
    :name="name"
    :disabled="disabled"
    :aria-label="element.label"
    :aria-required="element.required"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
    :class="element.id === 'legacy-body' ? 'min-h-40' : 'min-h-32'"
    :placeholder="element.placeholder"
  />

  <div v-else-if="element.control === 'markdown'" @focusin="fieldProps?.onFocus()" @focusout="fieldProps?.onBlur()">
    <MarkdownEditorField
      v-model="text"
      :id="element.id"
      :name="name"
      :disabled="disabled"
      :aria-invalid="ariaInvalid"
      :aria-described-by="ariaDescribedBy"
      :register-input="fieldProps?.ref"
      :field-path="fieldProps?.name"
      min-height-class="min-h-32"
    />
  </div>

  <input
    v-else-if="element.control === 'number'"
    v-bind="control"
    :value="text"
    :id="element.id"
    :name="name"
    :disabled="disabled"
    :aria-label="element.label"
    :aria-required="element.required"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
    :min="element.min ?? undefined"
    :max="element.max ?? undefined"
    type="number"
    @input="updateNumber"
  />

  <select
    v-else-if="element.control === 'select'"
    v-bind="control"
    v-model="text"
    :id="element.id"
    :name="name"
    :disabled="disabled"
    :aria-label="element.label"
    :aria-required="element.required"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedBy"
  >
    <option value="">選択してください</option>
    <option v-if="unavailableSelection" :value="unavailableSelection" disabled>
      {{ unavailableSelection }}（現在は選べません）
    </option>
    <option v-for="option in element.options" :key="option" :value="option">{{ option }}</option>
  </select>

  <div v-else-if="element.control === 'radio'" :id="element.id" class="grid gap-2">
    <label v-if="unavailableSelection" class="flex items-center gap-3 text-base text-body">
      <input
        v-bind="control"
        v-model="text"
        disabled
        type="radio"
        :name="name"
        :value="unavailableSelection"
        :aria-invalid="ariaInvalid"
        :aria-describedby="ariaDescribedBy"
      />
      <span>{{ unavailableSelection }}（現在は選べません）</span>
    </label>
    <label v-for="option in element.options" :key="option" class="flex items-center gap-3 text-base text-body">
      <input
        v-bind="control"
        v-model="text"
        :disabled="disabled"
        type="radio"
        :name="name"
        :value="option"
        :aria-invalid="ariaInvalid"
        :aria-describedby="ariaDescribedBy"
        :aria-required="element.required"
      />
      <span>{{ option }}</span>
    </label>
  </div>
</template>
