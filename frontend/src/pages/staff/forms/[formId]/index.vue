<script setup lang="ts">
definePage({
  path: '/staff/forms/:formId',
  redirect: (to) => `${to.path.replace(/\/+$/, '')}/edit`
})
</script>

<template>
  <p class="text-muted text-sm">リダイレクト中...</p>
</template>
