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
    class="flex items-center gap-3 border-b border-border px-5 py-3 text-sm transition last:border-b-0"
    :class="active ? 'bg-primary-light font-semibold text-primary' : 'text-body hover:bg-form-control'"
  >
    <span
      class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-[10px]"
    >
      {{ icon }}
    </span>
    {{ label }}
  </RouterLink>
</template>
