<script setup lang="ts">
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import SurfaceHeader from "@/components/ui/SurfaceHeader.vue";

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    overflowHidden?: boolean;
  }>(),
  {
    title: "",
    description: "",
    overflowHidden: false,
  },
);
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
    <slot />
  </SurfaceCard>
</template>
