<script setup lang="ts">
definePage({
  path: '/workspace/settings/appearance',
  meta: {
    requiresAuth: false
  }
})

import WorkspaceSettingsAppearanceContent from '@/features/session/components/WorkspaceSettingsAppearanceContent.vue'
</script>

<template>
  <WorkspaceSettingsAppearanceContent />
</template>
