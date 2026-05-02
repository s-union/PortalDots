<script setup lang="ts">
definePage({
  path: '/staff/participation-types/:typeId',
  redirect: (to) => to.path.replace('/staff/participation-types/', '/staff/circles/participation_types/')
})
</script>

<template>
  <p class="text-muted text-sm">リダイレクト中...</p>
</template>
