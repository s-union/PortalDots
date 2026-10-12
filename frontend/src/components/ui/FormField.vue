<script setup lang="ts">
import { computed } from 'vue'
import FormError from '@/components/ui/FormError.vue'

const {
  label,
  required,
  requiredLabel = '*',
  helper,
  error,
  labelClass,
  as,
  id,
  hideLabel,
  ariaLabelledby
} = defineProps<{
  label: string
  required?: boolean
  /** Text of the required marker next to the label (e.g. '必須' for dynamic-answer forms). */
  requiredLabel?: string
  helper?: string
  error?: string | boolean
  labelClass?: string
  as?: 'label' | 'div' | 'fieldset'
  id?: string
  /**
   * Suppresses this component's own `<label>`/`<legend>` (text and element) when another element
   * already serves as the single accessible label — e.g. `SchemaFormFields`' 'settings' variant
   * renders its own left-column `<label for>` (or, for `as="fieldset"`, a plain paragraph wired
   * through `ariaLabelledby`) instead of duplicating the label here.
   */
  hideLabel?: boolean
  /**
   * `<fieldset>`'s `aria-labelledby`, used only with `hideLabel` and `as="fieldset"`: a `<legend>`
   * can't be `for`-associated like a `<label>`, so an external label needs this to name the group.
   */
  ariaLabelledby?: string
}>()

const errorString = computed(() => (typeof error === 'string' ? error : undefined))
</script>

<template>
  <div v-if="as === 'fieldset'" class="grid gap-2 text-base text-body">
    <fieldset class="grid gap-2 text-base text-body" :aria-labelledby="hideLabel ? ariaLabelledby : undefined">
      <legend v-if="!hideLabel" :class="labelClass">
        {{ label }}
        <span v-if="required" class="text-danger">{{ requiredLabel }}</span>
      </legend>
      <slot />
      <span v-if="helper" :id="id ? `${id}-helper` : undefined" class="text-xs text-muted">{{ helper }}</span>
      <FormError v-if="errorString" :id="id ? `${id}-error` : undefined" :message="errorString!" />
    </fieldset>
  </div>
  <div v-else class="grid gap-2 text-base text-body">
    <label v-if="as !== 'div' && !hideLabel" class="grid gap-2 text-base text-body">
      <span :class="labelClass">
        {{ label }}
        <span v-if="required" class="text-danger">{{ requiredLabel }}</span>
      </span>
      <slot />
    </label>
    <template v-else-if="as !== 'div'"><slot /></template>
    <template v-else-if="!hideLabel">
      <label :for="id" :class="labelClass">
        {{ label }}
        <span v-if="required" class="text-danger">{{ requiredLabel }}</span>
      </label>
      <slot />
    </template>
    <template v-else><slot /></template>
    <span v-if="helper" :id="id ? `${id}-helper` : undefined" class="text-xs text-muted">{{ helper }}</span>
    <FormError v-if="errorString" :id="id ? `${id}-error` : undefined" :message="errorString!" />
  </div>
</template>
