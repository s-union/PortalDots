<script setup lang="ts">
import SurfaceCard from '@/components/ui/SurfaceCard.vue'

const { id, title, titleOutside } = defineProps<{
  id?: string
  title: string
  titleOutside?: boolean
}>()
</script>

<template>
  <div :id="id">
    <h2 v-if="titleOutside" class="mb-3 text-xl font-semibold leading-snug text-body">
      {{ title }}
    </h2>
    <SurfaceCard>
      <div v-if="!titleOutside" class="border-b border-border px-6 py-4">
        <h3 class="text-lg font-semibold text-body">{{ title }}</h3>
      </div>
      <div class="divide-y divide-border">
        <slot />
      </div>
      <div v-if="$slots.footer" class="border-t border-border px-6 py-5">
        <slot name="footer" />
      </div>
    </SurfaceCard>
  </div>
</template>
