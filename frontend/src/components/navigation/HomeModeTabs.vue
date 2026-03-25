<script setup lang="ts">
import { computed } from 'vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { buildHomeModeTabs } from '@/features/ui/tabStrip'

const { isStaffPage } = defineProps<{
  isStaffPage: boolean
}>()

const tabs = computed(() => buildHomeModeTabs(isStaffPage))
</script>

<template>
  <TabStrip :tabs="tabs" />
</template>
