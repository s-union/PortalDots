<script setup lang="ts">
const { message } = defineProps<{
  message?: string
}>()
</script>

<template>
  <p v-if="message" class="text-xs text-danger">{{ message }}</p>
</template>
