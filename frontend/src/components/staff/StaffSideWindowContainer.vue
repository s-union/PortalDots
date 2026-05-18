<script setup lang="ts">
const { isOpen = false } = defineProps<{
  isOpen?: boolean
}>()
</script>

<template>
  <div :data-side-window-open="isOpen ? 'true' : undefined">
    <slot />
  </div>
</template>
