<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { tabStripBadgeVariants, tabStripItemVariants } from '@/lib/ui/variants'
import type { TabStripItem } from '@/features/ui/tabStrip'

const { tabs } = defineProps<{
  tabs: TabStripItem[]
}>()
</script>

<template>
  <!-- Container: border-bottom, centered, scrollable on narrow screens (≤860px) -->
  <div
    class="flex justify-center overflow-hidden border-b border-border bg-surface px-6 max-[860px]:justify-start max-[860px]:overflow-x-auto max-[860px]:px-2"
  >
    <component
      v-for="tab in tabs"
      :key="tab.label"
      :is="tab.to ? RouterLink : tab.href ? 'a' : 'span'"
      :to="tab.to"
      :href="tab.href"
      :class="tabStripItemVariants({ active: tab.active })"
    >
      <!-- Active indicator: bottom 4px bar (replaces ::before pseudo-element) -->
      <span v-if="tab.active" class="absolute inset-x-0 bottom-0 h-1 rounded-t bg-primary" aria-hidden="true" />
      <span class="inline-flex items-center gap-2">
        <span>{{ tab.label }}</span>
        <span v-if="tab.badge" :class="tabStripBadgeVariants({ tone: tab.badgeTone })">
          {{ tab.badge }}
        </span>
      </span>
    </component>
  </div>
</template>
