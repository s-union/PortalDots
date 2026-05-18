<script setup lang="ts">
interface Props {
  message?: string
}

const { message = '読み込み中...' } = defineProps<Props>()
</script>

<template>
  <div class="px-6 py-6 text-sm text-muted">{{ message }}</div>
</template>
