<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import WorkspaceSettingsPasswordContent from '@/features/session/components/WorkspaceSettingsPasswordContent.vue'
</script>

<template>
  <WorkspaceSettingsPasswordContent />
</template>
