<script setup lang="ts">
import { RouterLink } from 'vue-router'

const { hasDrawer, pageTitle, appModeLabel, isStaffRoute } = defineProps<{
  hasDrawer: boolean
  pageTitle: string
  appModeLabel: string
  isStaffRoute: boolean
}>()

const emit = defineEmits<{
  'open-drawer': []
}>()
</script>

<template>
  <header
    class="navbar fixed right-0 top-0 z-[9980] flex h-20 items-center gap-4 bg-surface-2 px-6 shadow-lv1"
    :class="hasDrawer ? 'left-[320px] max-[1440px]:left-[280px] max-[1000px]:left-0' : 'left-0'"
  >
    <button
      v-if="hasDrawer"
      class="hidden max-[1000px]:flex items-center justify-center rounded p-2 text-body transition hover:bg-surface-light"
      type="button"
      aria-label="メニューを開く"
      @click="emit('open-drawer')"
    >
      <span class="text-xl leading-none">☰</span>
    </button>

    <div v-if="hasDrawer" class="min-w-0">
      <p class="truncate text-lg font-semibold text-body">{{ pageTitle }}</p>
      <p class="mt-1 text-xs text-muted">{{ appModeLabel }}</p>
    </div>

    <RouterLink
      v-else
      class="text-lg font-semibold text-body no-underline hover:no-underline"
      :to="isStaffRoute ? '/staff' : '/'"
    >
      PortalDots
    </RouterLink>
  </header>
</template>
