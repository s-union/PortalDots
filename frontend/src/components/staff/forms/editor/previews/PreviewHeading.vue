<script setup lang="ts">
defineProps<{
  name: string
  description: string
}>()
</script>

<template>
  <h2 class="text-2xl font-bold text-body">{{ name || '(無題のセクション見出し)' }}</h2>
  <p v-if="description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
    {{ description }}
  </p>
</template>
