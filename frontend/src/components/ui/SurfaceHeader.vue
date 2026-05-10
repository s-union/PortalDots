<script setup lang="ts">
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'

const { borderless } = defineProps<{
  borderless?: boolean
}>()
</script>

<template>
  <SurfaceCardBand class="py-4" :borderless="borderless">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 v-if="$slots.title" class="text-lg font-semibold text-body">
          <slot name="title" />
        </h2>
        <div v-if="$slots.description" class="mt-2 text-sm leading-7 text-muted">
          <slot name="description" />
        </div>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-3">
        <slot name="actions" />
      </div>
    </div>
  </SurfaceCardBand>
</template>
