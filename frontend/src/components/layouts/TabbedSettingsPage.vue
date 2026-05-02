<script setup lang="ts">
import type { TabStripItem } from '@/lib/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'
import TabStrip from '@/components/ui/TabStrip.vue'

const { tabs } = defineProps<{
  tabs: TabStripItem[]
}>()
</script>

<template>
  <PageLayout>
    <TabStrip :tabs="tabs" />
    <slot />
  </PageLayout>
</template>
