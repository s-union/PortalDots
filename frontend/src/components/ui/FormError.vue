<script setup lang="ts">
const { message, id } = defineProps<{
  message?: string
  id?: string
}>()
</script>

<template>
  <p v-if="message" :id="id" class="text-xs text-danger">{{ message }}</p>
</template>
