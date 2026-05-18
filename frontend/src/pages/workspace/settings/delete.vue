<script setup lang="ts">
definePage({
  path: '/workspace/settings/delete',
  meta: {
    requiresAuth: true
  }
})

import WorkspaceSettingsDeleteContent from '@/features/session/components/WorkspaceSettingsDeleteContent.vue'
</script>

<template>
  <WorkspaceSettingsDeleteContent />
</template>
