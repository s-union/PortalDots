<script setup lang="ts">
const { value } = defineProps<{
  value: boolean
}>()
</script>

<template>
  <strong v-if="value">はい</strong>
  <span v-else class="text-muted">-</span>
</template>
