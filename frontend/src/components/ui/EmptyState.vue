<script setup lang="ts">
import type { IconName } from '@fortawesome/fontawesome-svg-core'
import { cn } from '@/lib/ui/cn'
import FaIcon from '@/components/ui/FaIcon.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'

const {
  title,
  description = '',
  icon = '',
  class: className
} = defineProps<{
  title: string
  description?: string
  icon?: IconName | ''
  class?: string
}>()
</script>

<template>
  <SurfaceCard :class="cn(className)">
    <div class="px-6 py-16 text-center">
      <div v-if="icon" class="inline-flex items-center justify-center text-muted-2">
        <FaIcon :name="icon" className="text-4xl" />
      </div>
      <p class="mt-5 text-lg font-medium text-body">{{ title }}</p>
      <p v-if="description" class="mt-2 text-sm text-muted">
        {{ description }}
      </p>
    </div>
  </SurfaceCard>
</template>
