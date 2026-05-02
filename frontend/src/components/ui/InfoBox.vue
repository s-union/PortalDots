<script setup lang="ts">
const { as } = defineProps<{
  as?: string
}>()
</script>

<template>
  <component :is="as ?? 'div'" class="rounded border border-border bg-surface-light px-4 py-4 text-sm text-body">
    <slot />
  </component>
</template>
