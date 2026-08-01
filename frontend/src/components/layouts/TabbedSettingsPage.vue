<script setup lang="ts">
import type { TabStripItem } from '@/lib/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'
import TabStrip from '@/components/ui/TabStrip.vue'

const { tabs } = defineProps<{
  tabs: TabStripItem[]
}>()
</script>

<template>
  <PageLayout fullWidth class="px-0 max-[1000px]:px-0">
    <TabStrip :tabs="tabs" />
    <div class="px-6 max-[1000px]:px-4">
      <slot />
    </div>
  </PageLayout>
</template>
