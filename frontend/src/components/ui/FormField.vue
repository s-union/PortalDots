<script setup lang="ts">
import { computed } from 'vue'
import FormError from '@/components/ui/FormError.vue'

const { label, required, helper, error, labelClass, as, id } = defineProps<{
  label: string
  required?: boolean
  helper?: string
  error?: string | boolean
  labelClass?: string
  as?: 'label' | 'div' | 'fieldset'
  id?: string
}>()

const errorString = computed(() => (typeof error === 'string' ? error : undefined))
</script>

<template>
  <div v-if="as === 'fieldset'" class="grid gap-2 text-base text-body">
    <fieldset class="grid gap-2 text-base text-body">
      <legend :class="labelClass">
        {{ label }}
        <span v-if="required" class="text-danger">*</span>
      </legend>
      <slot />
      <span v-if="helper" :id="id ? `${id}-helper` : undefined" class="text-xs text-muted">{{ helper }}</span>
      <FormError v-if="errorString" :id="id ? `${id}-error` : undefined" :message="errorString!" />
    </fieldset>
  </div>
  <div v-else class="grid gap-2 text-base text-body">
    <label v-if="as !== 'div'" class="grid gap-2 text-base text-body">
      <span :class="labelClass">
        {{ label }}
        <span v-if="required" class="text-danger">*</span>
      </span>
      <slot />
    </label>
    <template v-else>
      <label :for="id" :class="labelClass">
        {{ label }}
        <span v-if="required" class="text-danger">*</span>
      </label>
      <slot />
    </template>
    <span v-if="helper" :id="id ? `${id}-helper` : undefined" class="text-xs text-muted">{{ helper }}</span>
    <FormError v-if="errorString" :id="id ? `${id}-error` : undefined" :message="errorString!" />
  </div>
</template>
