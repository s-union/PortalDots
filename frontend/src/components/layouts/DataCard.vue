<script setup lang="ts">
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
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

    <div v-if="$slots.toolbar" class="border-b border-border px-6 py-4">
      <slot name="toolbar" />
    </div>

    <slot />

    <slot name="footer" />
  </SurfaceCard>
</template>
