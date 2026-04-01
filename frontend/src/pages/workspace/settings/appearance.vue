<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false
  }
})

import WorkspaceSettingsAppearanceContent from '@/features/session/components/WorkspaceSettingsAppearanceContent.vue'
</script>

<template>
  <WorkspaceSettingsAppearanceContent />
</template>
