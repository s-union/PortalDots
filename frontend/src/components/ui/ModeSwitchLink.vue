<script setup lang="ts">
defineProps<{
  to: string;
  label: string;
}>();
</script>

<template>
  <RouterLink
    :to="to"
    class="inline-flex items-center justify-center rounded bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
  >
    {{ label }}
  </RouterLink>
</template>
