<script setup lang="ts">
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import SurfaceHeader from "@/components/ui/SurfaceHeader.vue";

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    legacy?: boolean;
    overflowHidden?: boolean;
  }>(),
  {
    title: "",
    description: "",
    legacy: false,
    overflowHidden: false,
  },
);
</script>

<template>
  <section v-if="legacy" class="pb-2 pt-4">
    <div
      v-if="title || description || $slots.actions"
      class="flex flex-wrap items-start justify-between gap-4 px-0 pb-2 pt-4"
    >
      <div>
        <h2 v-if="title" class="text-[1.333rem] font-semibold leading-[1.4] text-body">
          {{ title }}
        </h2>
        <div v-if="description" class="mt-px text-base text-muted">
          {{ description }}
        </div>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-3">
        <slot name="actions" />
      </div>
    </div>
    <div
      :class="['rounded-[0.45rem] bg-surface shadow-lv1', overflowHidden ? 'overflow-hidden' : '']"
    >
      <slot />
    </div>
  </section>

  <SurfaceCard v-else :overflow-hidden="overflowHidden">
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
