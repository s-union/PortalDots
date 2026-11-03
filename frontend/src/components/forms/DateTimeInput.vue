<script setup lang="ts">
import { computed } from 'vue'
import type { FieldElementProps } from '@formisch/vue'
import { formatDateTimeLocalValue, parseDateTimeLocalValue } from '@/lib/format/datetime'

const input = defineModel<string | undefined>()
const { control } = defineProps<{ control: FieldElementProps }>()
const localValue = computed({
  get: () => formatDateTimeLocalValue(input.value ?? ''),
  set: (value: string) => {
    input.value = parseDateTimeLocalValue(value, input.value ?? '')
  }
})
</script>

<template>
  <input v-bind="control" v-model="localValue" type="datetime-local" />
</template>
