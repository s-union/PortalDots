<script setup lang="ts">
import { tabStripItemVariants } from "@/lib/ui/variants";

type TabItem = {
  label: string;
  active?: boolean;
  href?: string;
};

defineProps<{
  tabs: TabItem[];
}>();
</script>

<template>
  <!-- Container: border-bottom, centered, scrollable on narrow screens (≤860px) -->
  <div
    class="flex overflow-hidden border-b border-border px-6 justify-center max-[860px]:justify-start max-[860px]:overflow-x-auto max-[860px]:px-2"
  >
    <component
      v-for="tab in tabs"
      :key="tab.label"
      :is="tab.href ? 'a' : 'span'"
      :href="tab.href"
      :class="tabStripItemVariants({ active: tab.active })"
    >
      <!-- Active indicator: bottom 4px bar (replaces ::before pseudo-element) -->
      <span
        v-if="tab.active"
        class="absolute inset-x-0 bottom-0 h-1 rounded-t bg-primary"
        aria-hidden="true"
      />
      {{ tab.label }}
    </component>
  </div>
</template>
