<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <p v-if="message" class="text-xs text-danger">{{ message }}</p>
</template>
