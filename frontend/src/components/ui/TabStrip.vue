<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { tabStripBadgeVariants, tabStripItemVariants } from '@/lib/ui/variants'
import type { TabStripItem } from '@/lib/ui/tabStrip'

const { tabs } = defineProps<{
  tabs: TabStripItem[]
}>()
</script>

<template>
  <!-- Tabs stay centered when they fit and remain fully scrollable when they overflow. -->
  <div class="overflow-x-auto border-b border-border bg-surface">
    <div class="flex w-max min-w-full justify-center">
      <component
        v-for="tab in tabs"
        :key="tab.label"
        :is="tab.to ? RouterLink : tab.href ? 'a' : 'span'"
        :to="tab.to"
        :href="tab.href"
        :class="[tabStripItemVariants({ active: tab.active }), (tab.to || tab.href) && 'cursor-pointer']"
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
  </div>
</template>
