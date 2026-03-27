<script setup lang="ts">
definePage({
  path: '/staff/forms/:formId',
  redirect: (to) => `${to.path.replace(/\/+$/, '')}/edit`
})
</script>

<template></template>
