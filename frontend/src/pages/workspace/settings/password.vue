<script setup lang="ts">
definePage({
  path: '/workspace/settings/password',
  meta: {
    requiresAuth: true
  }
})

import WorkspaceSettingsPasswordContent from '@/features/session/components/WorkspaceSettingsPasswordContent.vue'
</script>

<template>
  <WorkspaceSettingsPasswordContent />
</template>
