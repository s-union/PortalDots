<script setup lang="ts">
import BottomTabLink from '@/components/ui/BottomTabLink.vue'
import type { MobileTabLink } from '@/app/types/shell'

const { tabs } = defineProps<{
  tabs: MobileTabLink[]
}>()
</script>

<template>
  <div
    class="mx-auto grid w-full max-w-[600px] pb-[env(safe-area-inset-bottom)]"
    :style="{ gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))` }"
  >
    <BottomTabLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      :label="tab.label"
      :icon-class="tab.iconClass"
      :active="tab.active"
      :show-notifier="tab.showNotifier"
    />
  </div>
</template>
