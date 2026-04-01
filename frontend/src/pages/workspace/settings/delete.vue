<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import WorkspaceSettingsDeleteContent from '@/features/session/components/WorkspaceSettingsDeleteContent.vue'
</script>

<template>
  <WorkspaceSettingsDeleteContent />
</template>
