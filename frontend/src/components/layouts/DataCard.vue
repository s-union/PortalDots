<script setup lang="ts">
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'

const {
  title = '',
  description = '',
  overflowHidden = false
} = defineProps<{
  title?: string
  description?: string
  overflowHidden?: boolean
}>()
</script>

<template>
  <SurfaceCard :overflow-hidden="overflowHidden">
    <SurfaceHeader v-if="title || description || $slots.actions">
      <template v-if="title" #title>{{ title }}</template>
      <template v-if="description" #description>{{ description }}</template>
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </SurfaceHeader>

    <SurfaceCardBand v-if="$slots.toolbar" class="py-4">
      <slot name="toolbar" />
    </SurfaceCardBand>

    <slot />

    <slot name="footer" />
  </SurfaceCard>
</template>
