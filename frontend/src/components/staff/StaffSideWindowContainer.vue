<script setup lang="ts">
const { isOpen = false } = defineProps<{
  isOpen?: boolean
}>()
</script>

<template>
  <div
    class="transition-[padding] duration-300 ease-in-out"
    :class="isOpen ? 'pr-[min(640px,max(400px,40vw))] max-[860px]:pr-0' : ''"
  >
    <slot />
  </div>
</template>
