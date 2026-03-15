<script setup lang="ts">
import SurfaceCard from "@/components/ui/SurfaceCard.vue";

defineProps<{
  title: string;
}>();
</script>

<template>
  <SurfaceCard>
    <div class="border-b border-border px-6 py-4">
      <h3 class="text-lg font-semibold text-body">{{ title }}</h3>
    </div>
    <div class="divide-y divide-border">
      <slot />
    </div>
    <div v-if="$slots.footer" class="border-t border-border px-6 py-5">
      <slot name="footer" />
    </div>
  </SurfaceCard>
</template>
