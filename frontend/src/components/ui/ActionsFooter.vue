<script setup lang="ts">
const { align } = defineProps<{
  align?: 'end' | 'center'
}>()
</script>

<template>
  <div :class="['flex flex-wrap gap-3', align === 'center' ? 'justify-center' : 'justify-end']">
    <slot />
  </div>
</template>
