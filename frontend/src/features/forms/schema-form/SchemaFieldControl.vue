<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import type { FieldStore, FormSchema, RequiredPath } from '@formisch/vue'
import CheckboxField from '@/components/ui/CheckboxField.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import DateTimeInput from '@/components/forms/DateTimeInput.vue'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import StaffUserPicker from '@/components/staff/StaffUserPicker.vue'
import InfoBox from '@/components/ui/InfoBox.vue'
import type { FieldControl } from '@/components/forms/field-control'
import { tagColorClass } from '@/lib/tagColor'
import type { FieldOption, FieldUi } from './ui'
import type { FieldOverride } from './types'

const { ui, field, control, disabled, readonly, required, override, name } = defineProps<{
  ui: FieldUi
  // Internal implementation detail: loosely typed because the caller (SchemaFormFields.vue)
  // already checks the real path/schema against the form's exact type.
  field: FieldStore<FormSchema, RequiredPath>
  control: FieldControl
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  override?: FieldOverride
  name: string
}>()

const PLACEHOLDER_OPTION = '選択してください'

function options(): readonly FieldOption[] {
  return override?.options ?? ('options' in ui ? (ui.options ?? []) : [])
}

function keepsUnavailableValue(): boolean {
  return 'keepUnavailableValue' in ui && ui.keepUnavailableValue === true
}

// Vue's native `v-model` coerces any `<input type="number">` to a JS number regardless of the
// `.number` modifier (it checks the element's own `type`, not just the modifier — see
// `@vue/runtime-dom`'s `vModelText`). A `stringValue` numeric control needs the raw string instead
// (see `FieldUi`'s `number.stringValue`), so it binds one-way and writes the input event's value
// directly, bypassing that coercion entirely.
function updateStringNumber(event: Event) {
  if (event.target instanceof HTMLInputElement) field.input = event.target.value
}

// `field.input` is typed `unknown` (SchemaFieldControl is intentionally loosely typed, see above),
// so native `v-model` needs an explicitly typed read/write proxy for each value kind it binds to.
const text = computed({
  get: () => (field.input as string | undefined) ?? '',
  set: (value: string) => {
    field.input = value
  }
})
const numberInput = computed({
  get: () => field.input as number | string | undefined,
  set: (value: number | string) => {
    field.input = value
  }
})
const checkboxGroup = computed({
  get: () => (field.input as string[] | undefined) ?? [],
  set: (value: string[]) => {
    field.input = value
  }
})

// select/radio: a selected value that was later removed from `options` (e.g. a dynamic answer's
// question was edited) still renders as a disabled extra option, so the page can show *and* let
// the user replace it, rather than silently clearing the field.
const unavailableValue = computed(() => {
  if (!keepsUnavailableValue() || text.value === '') return undefined
  return options().some((option) => String(option.value) === text.value) ? undefined : text.value
})

interface CheckboxGroupOption extends FieldOption {
  obsolete?: boolean
}

// checkboxGroup: same idea, but every obsolete *selected* value is kept (not just one), since a
// checkbox group can have more than one.
const checkboxGroupOptions = computed<readonly CheckboxGroupOption[]>(() => {
  const base = options()
  if (!keepsUnavailableValue()) return base
  const known = new Set(base.map((option) => String(option.value)))
  const obsolete = checkboxGroup.value
    .filter((value) => !known.has(value))
    .map((value): CheckboxGroupOption => ({ value, label: value, obsolete: true }))
  return [...base, ...obsolete]
})

const checkboxGroupRef = useTemplateRef<HTMLDivElement>('checkboxGroupRef')

// Removing an obsolete checkbox removes its control; keep keyboard focus within the group instead
// of letting it fall back to the document body.
async function handleCheckboxGroupChange(event: Event) {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement) || input.checked || !input.matches(':focus')) return
  if (options().some((option) => String(option.value) === input.value)) return
  await nextTick()
  checkboxGroupRef.value?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus()
}
</script>

<template>
  <template
    v-if="
      ui.control === 'text' ||
      ui.control === 'email' ||
      ui.control === 'tel' ||
      ui.control === 'password' ||
      ui.control === 'url'
    "
  >
    <div
      v-if="ui.prefix || override?.prefix || ui.suffix || override?.suffix"
      class="grid gap-2 sm:items-center"
      :class="
        ui.prefix || override?.prefix
          ? ui.suffix || override?.suffix
            ? 'sm:grid-cols-[auto_minmax(0,1fr)_auto]'
            : 'sm:grid-cols-[auto_minmax(0,1fr)]'
          : 'sm:grid-cols-[minmax(0,1fr)_auto]'
      "
    >
      <span v-if="ui.prefix || override?.prefix" class="text-base text-muted">{{ override?.prefix ?? ui.prefix }}</span>
      <input
        v-bind="control"
        v-model="text"
        :autocomplete="ui.autocomplete"
        :class="override?.inputClass ?? ui.inputClass"
        :disabled="disabled"
        :name="name"
        :placeholder="override?.placeholder ?? ui.placeholder"
        :readonly="readonly"
        :required="required"
        :type="ui.control"
      />
      <span v-if="ui.suffix || override?.suffix" class="text-base text-muted">{{ override?.suffix ?? ui.suffix }}</span>
    </div>
    <input
      v-else
      v-bind="control"
      v-model="text"
      :autocomplete="ui.autocomplete"
      :class="override?.inputClass ?? ui.inputClass"
      :disabled="disabled"
      :name="name"
      :placeholder="override?.placeholder ?? ui.placeholder"
      :readonly="readonly"
      :required="required"
      :type="ui.control"
    />
  </template>

  <input
    v-else-if="ui.control === 'number' && ui.stringValue"
    v-bind="control"
    :class="override?.inputClass ?? ui.inputClass"
    :disabled="disabled"
    :max="ui.max"
    :min="ui.min"
    :name="name"
    :placeholder="override?.placeholder ?? ui.placeholder"
    :readonly="readonly"
    :required="required"
    :step="ui.step"
    type="number"
    :value="text"
    @input="updateStringNumber"
  />
  <input
    v-else-if="ui.control === 'number'"
    v-bind="control"
    v-model.number="numberInput"
    :class="override?.inputClass ?? ui.inputClass"
    :disabled="disabled"
    :max="ui.max"
    :min="ui.min"
    :name="name"
    :placeholder="override?.placeholder ?? ui.placeholder"
    :readonly="readonly"
    :required="required"
    :step="ui.step"
    type="number"
  />

  <textarea
    v-else-if="ui.control === 'textarea'"
    v-bind="control"
    v-model="text"
    :class="override?.inputClass ?? ui.inputClass"
    :disabled="disabled"
    :name="name"
    :placeholder="override?.placeholder ?? ui.placeholder"
    :readonly="readonly"
    :required="required"
    :rows="ui.rows"
  />

  <MarkdownEditorField
    v-else-if="ui.control === 'markdown'"
    :control="control"
    :disabled="disabled"
    :min-height-class="ui.inputClass"
    :model-value="(field.input as string | undefined) ?? ''"
    :name="name"
    :placeholder="override?.placeholder ?? ui.placeholder"
    @update:model-value="field.input = $event"
  />

  <select
    v-else-if="ui.control === 'select'"
    v-bind="control"
    v-model="text"
    :class="ui.inputClass"
    :disabled="disabled"
    :name="name"
    :required="required"
  >
    <option value="">{{ ui.placeholderOption ?? PLACEHOLDER_OPTION }}</option>
    <option v-if="unavailableValue" :value="unavailableValue" disabled>
      {{ unavailableValue }}（現在は選べません）
    </option>
    <option v-for="option in options()" :key="option.value" :disabled="option.disabled" :value="option.value">
      {{ option.label }}
    </option>
  </select>

  <div v-else-if="ui.control === 'radio'" class="grid gap-2">
    <label v-if="unavailableValue" class="flex items-center gap-3 text-base text-body">
      <input v-bind="control" v-model="text" :name="name" :value="unavailableValue" disabled type="radio" />
      {{ unavailableValue }}（現在は選べません）
    </label>
    <label v-for="option in options()" :key="option.value" class="flex items-center gap-3 text-base text-body">
      <input
        v-bind="control"
        v-model="text"
        :disabled="disabled || option.disabled"
        :name="name"
        :required="required"
        :value="option.value"
        type="radio"
      />
      {{ option.label }}
    </label>
  </div>

  <CheckboxField
    v-if="ui.control === 'checkbox' && (ui.variant ?? 'default') === 'default'"
    :control="control"
    :class="override?.inputClass ?? ui.inputClass"
    :disabled="disabled"
    :label="ui.checkboxLabel ?? ui.label"
    :model-value="(field.input as boolean | undefined) ?? false"
    :name="name"
    :required="required"
    @update:model-value="field.input = $event"
  />
  <label
    v-else-if="ui.control === 'checkbox'"
    class="flex items-start gap-3 rounded border border-border bg-surface-light px-4 py-3 text-base text-body"
  >
    <input
      v-bind="control"
      :checked="(field.input as boolean | undefined) ?? false"
      class="mt-1"
      :disabled="disabled"
      :name="name"
      :required="required"
      type="checkbox"
      @change="field.input = ($event.target as HTMLInputElement).checked"
    />
    <span>
      <span class="block font-medium">{{ ui.checkboxLabel ?? ui.label }}</span>
      <span v-if="ui.description" class="mt-1 block text-base leading-6 text-muted-2">{{ ui.description }}</span>
    </span>
  </label>

  <template v-else-if="ui.control === 'checkboxGroup'">
    <InfoBox v-if="override?.loading" class="text-muted">
      {{ override?.loadingMessage ?? ui.loadingMessage ?? '読み込み中...' }}
    </InfoBox>
    <InfoBox v-else-if="options().length === 0 && (override?.emptyMessage ?? ui.emptyMessage)" class="text-muted">
      {{ override?.emptyMessage ?? ui.emptyMessage }}
    </InfoBox>
    <div v-else ref="checkboxGroupRef" class="grid gap-2" :class="override?.inputClass ?? ui.inputClass">
      <label
        v-for="option in checkboxGroupOptions"
        :key="option.value"
        class="flex gap-3 text-base text-body"
        :class="option.description ? 'items-start' : 'items-center'"
      >
        <input
          v-bind="control"
          v-model="checkboxGroup"
          :disabled="disabled || option.disabled"
          :name="name"
          :value="option.value"
          type="checkbox"
          @change="handleCheckboxGroupChange"
        />
        <span v-if="option.description">
          <strong class="text-body">{{ option.label }}</strong>
          <span class="block text-xs text-muted">{{ option.description }}</span>
        </span>
        <span v-else>{{ option.label }}{{ option.obsolete ? '（現在は選べません）' : '' }}</span>
      </label>
    </div>
  </template>

  <DateTimeInput
    v-else-if="ui.control === 'datetime'"
    :control="control"
    :class="override?.inputClass ?? ui.inputClass"
    :disabled="disabled"
    :name="name"
    :required="required"
    :model-value="field.input as string | undefined"
    @update:model-value="field.input = $event"
  />

  <StaffTagPicker
    v-else-if="ui.control === 'tags'"
    :available-tags="[...(override?.availableTags ?? [])]"
    :control="control"
    :disabled="disabled"
    :empty-message="override?.emptyMessage ?? ui.emptyMessage"
    :model-value="(field.input as string[] | undefined) ?? []"
    :name="name"
    :placeholder="override?.placeholder ?? ui.placeholder"
    :tag-colors="override?.tagColors ?? {}"
    @update:model-value="field.input = $event"
  />

  <StaffUserPicker
    v-else-if="ui.control === 'users'"
    :control="control"
    :disabled="disabled"
    :empty-message="override?.emptyMessage ?? ui.emptyMessage"
    :initial-search-query="override?.initialSearchQuery"
    :model-value="(field.input as string[] | undefined) ?? []"
    :name="name"
    :placeholder="override?.placeholder ?? ui.placeholder"
    @update:model-value="field.input = $event"
  />

  <div v-else-if="ui.control === 'colorRadio'" class="flex flex-wrap gap-2">
    <label
      v-for="option in options()"
      :key="option.value"
      :class="[
        'inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm font-medium transition focus-within:ring-2 focus-within:ring-primary',
        tagColorClass(String(option.value)),
        text === String(option.value) ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''
      ]"
    >
      <input
        v-bind="control"
        v-model="text"
        :disabled="disabled || option.disabled"
        :id="`${control.id}-${option.value}`"
        :name="name"
        :value="option.value"
        class="sr-only"
        type="radio"
      />
      {{ option.label }}
    </label>
  </div>
</template>
