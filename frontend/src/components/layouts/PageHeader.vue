<script setup lang="ts">
const { title, description } = defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="flex items-end justify-between gap-4">
    <div>
      <h2 class="text-2xl font-semibold text-body">
        {{ title }}
      </h2>
      <p v-if="description" class="mt-3 text-sm leading-7 text-muted">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap gap-3">
      <slot name="actions" />
    </div>
  </header>
</template>
