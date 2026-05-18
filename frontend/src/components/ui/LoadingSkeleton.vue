<script setup lang="ts">
const { variant = 'default' } = defineProps<{
  variant?: 'default' | 'list' | 'detail'
}>()
</script>

<template>
  <div class="animate-pulse rounded border border-border bg-surface p-6 shadow-lv1">
    <template v-if="variant === 'list'">
      <div class="space-y-4">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4">
          <div class="h-4 w-1/4 rounded bg-border" />
          <div class="h-4 flex-1 rounded bg-border" />
        </div>
      </div>
    </template>
    <template v-else-if="variant === 'detail'">
      <div class="space-y-4">
        <div class="h-6 w-1/3 rounded bg-border" />
        <div class="h-4 w-full rounded bg-border" />
        <div class="h-4 w-3/4 rounded bg-border" />
        <div class="h-4 w-5/6 rounded bg-border" />
      </div>
    </template>
    <template v-else>
      <div class="text-muted">読み込み中...</div>
    </template>
  </div>
</template>
