<script setup lang="ts">
defineProps<{
  to: string;
}>();
</script>

<template>
  <RouterLink
    :to="to"
    class="inline-flex rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
  >
    <slot />
  </RouterLink>
</template>
