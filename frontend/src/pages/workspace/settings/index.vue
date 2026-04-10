<script setup lang="ts">
definePage({
  path: '/workspace/settings',
  meta: {
    requiresAuth: true
  }
})

import WorkspaceSettingsGeneralContent from '@/features/session/components/WorkspaceSettingsGeneralContent.vue'
</script>

<template>
  <WorkspaceSettingsGeneralContent />
</template>
