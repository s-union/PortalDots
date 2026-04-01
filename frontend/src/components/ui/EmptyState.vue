<script setup lang="ts">
import { cn } from '@/lib/ui/cn'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'

const {
  title,
  description = '',
  icon = '',
  class: className
} = defineProps<{
  title: string
  description?: string
  icon?: string
  class?: string
}>()
</script>

<template>
  <SurfaceCard :class="cn(className)">
    <div class="px-6 py-16 text-center">
      <p v-if="icon" class="text-4xl">{{ icon }}</p>
      <p class="mt-5 text-lg font-medium text-body">{{ title }}</p>
      <p v-if="description" class="mt-2 text-sm text-muted">
        {{ description }}
      </p>
    </div>
  </SurfaceCard>
</template>
