<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const PageMarkdownContent = defineAsyncComponent(() => import('@/features/pages/components/PageMarkdownContent.vue'))

defineProps<{
  name: string
  description: string
  isRequired: boolean
}>()
</script>

<template>
  <div class="mb-2 flex items-center gap-2">
    <span class="font-medium text-body">{{ name || '(無題の設問)' }}</span>
    <span v-if="isRequired" class="rounded bg-danger px-1.5 py-0.5 text-xs font-bold text-white">必須</span>
  </div>
  <PageMarkdownContent v-if="description" class="mb-2" :source="description" />
  <div class="rounded border border-border bg-form-control px-3 py-3 text-sm text-muted">Markdown 入力</div>
</template>
