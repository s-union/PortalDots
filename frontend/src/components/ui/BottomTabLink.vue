<script setup lang="ts">
defineProps<{
  to: string;
  label: string;
  icon: string;
  active?: boolean;
}>();
</script>

<template>
  <RouterLink
    :to="to"
    class="px-2 py-3 text-center text-xs"
    :class="active ? 'font-semibold text-primary' : 'text-muted'"
  >
    <div class="mx-auto mb-1 inline-flex h-5 w-5 items-center justify-center text-[10px]">
      {{ icon }}
    </div>
    {{ label }}
  </RouterLink>
</template>
