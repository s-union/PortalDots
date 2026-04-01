<script setup lang="ts">
import { cn } from '@/lib/ui/cn'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'

const { message = '読み込み中...', class: className } = defineProps<{
  message?: string
  class?: string
}>()
</script>

<template>
  <SurfaceCard :class="cn(className)">
    <div class="px-6 py-5 text-sm text-muted">
      {{ message }}
    </div>
  </SurfaceCard>
</template>
