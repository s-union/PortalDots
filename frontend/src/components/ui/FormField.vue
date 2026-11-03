<script setup lang="ts">
import { computed } from 'vue'
import FormError from '@/components/ui/FormError.vue'

const {
  label,
  required,
  requiredLabel = '*',
  helper,
  helperAs = 'span',
  helperClass,
  wrapControl,
  error,
  labelClass,
  as,
  id,
  hideLabel,
  ariaLabelledby,
  labelVariant
} = defineProps<{
  label: string
  /** Question headings keep their description above the answer control. */
  labelVariant?: 'answer'
  required?: boolean
  /** Text of the required marker next to the label (e.g. '必須' for dynamic-answer forms). */
  requiredLabel?: string
  helper?: string
  helperAs?: 'span' | 'p'
  helperClass?: string
  wrapControl?: boolean
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
  <div v-if="labelVariant === 'answer'" class="grid min-w-0 gap-3 text-base text-body">
    <fieldset v-if="as === 'fieldset'" class="grid min-w-0 gap-3" :aria-labelledby="id ? `${id}-label` : undefined">
      <legend class="mb-3">
        <span
          :id="id ? `${id}-label` : undefined"
          class="block text-base font-semibold text-body"
          :class="{ 'mb-4': helper }"
        >
          {{ label }}
          <span v-if="required && requiredLabel" class="ml-2 text-xs font-semibold text-danger">{{
            requiredLabel
          }}</span>
        </span>
        <p
          v-if="helper"
          :id="id ? `${id}-helper` : undefined"
          class="mt-2 whitespace-pre-wrap text-base leading-7 text-muted"
        >
          {{ helper }}
        </p>
      </legend>
      <div v-if="wrapControl" class="leading-[1.7]"><slot /></div>
      <slot v-else />
      <FormError v-if="errorString" :id="id ? `${id}-error` : undefined" :message="errorString!" />
    </fieldset>
    <template v-else>
      <div>
        <label :for="id" class="block text-base font-semibold text-body" :class="{ 'mb-4': helper }">
          {{ label }}
          <span v-if="required && requiredLabel" class="ml-2 text-xs font-semibold text-danger">{{
            requiredLabel
          }}</span>
        </label>
        <p
          v-if="helper"
          :id="id ? `${id}-helper` : undefined"
          class="mt-2 whitespace-pre-wrap text-base leading-7 text-muted"
        >
          {{ helper }}
        </p>
      </div>
      <div v-if="wrapControl" class="leading-[1.7]"><slot /></div>
      <slot v-else />
      <FormError v-if="errorString" :id="id ? `${id}-error` : undefined" :message="errorString!" />
    </template>
  </div>
  <div v-else-if="as === 'fieldset'" class="grid gap-2 text-base text-body">
    <fieldset class="grid gap-2 text-base text-body" :aria-labelledby="hideLabel ? ariaLabelledby : undefined">
      <legend v-if="!hideLabel" :class="labelClass">
        {{ label }}
        <span v-if="required && requiredLabel" class="text-danger">{{ requiredLabel }}</span>
      </legend>
      <slot />
      <span v-if="helper" :id="id ? `${id}-helper` : undefined" class="text-xs text-muted" :class="helperClass">{{
        helper
      }}</span>
      <FormError v-if="errorString" :id="id ? `${id}-error` : undefined" :message="errorString!" />
    </fieldset>
  </div>
  <div v-else class="grid gap-2 text-base text-body">
    <label v-if="as !== 'div' && !hideLabel" class="grid gap-2 text-base text-body">
      <span :class="labelClass">
        {{ label }}
        <span v-if="required && requiredLabel" class="text-danger">{{ requiredLabel }}</span>
      </span>
      <slot />
    </label>
    <template v-else-if="as !== 'div'"><slot /></template>
    <template v-else-if="!hideLabel">
      <label :for="id" :class="labelClass">
        {{ label }}
        <span v-if="required && requiredLabel" class="text-danger">{{ requiredLabel }}</span>
      </label>
      <slot />
    </template>
    <template v-else><slot /></template>
    <component
      :is="helperAs"
      v-if="helper"
      :id="id ? `${id}-helper` : undefined"
      class="text-xs text-muted"
      :class="helperClass"
      >{{ helper }}</component
    >
    <FormError v-if="errorString" :id="id ? `${id}-error` : undefined" :message="errorString!" />
  </div>
</template>
