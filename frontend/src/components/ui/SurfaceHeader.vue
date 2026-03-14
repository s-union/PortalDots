<script setup lang="ts">
defineProps<{
  borderless?: boolean;
}>();
</script>

<template>
  <div :class="['px-6 py-4', borderless ? '' : 'border-b border-border']">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div v-if="$slots.eyebrow" class="text-sm text-primary">
          <slot name="eyebrow" />
        </div>
        <h3 v-if="$slots.title" class="text-lg font-semibold text-body">
          <slot name="title" />
        </h3>
        <div v-if="$slots.description" class="mt-2 text-sm leading-7 text-muted">
          <slot name="description" />
        </div>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-3">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
