<script setup lang="ts">
defineProps<{
  title: string;
  meta: string;
}>();
</script>

<template>
  <article class="rounded border border-border bg-surface-light p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs text-primary">{{ meta }}</p>
        <h4 class="mt-2 text-lg font-medium text-body">{{ title }}</h4>
      </div>
      <div class="flex flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div class="mt-4 grid gap-4">
      <slot />
    </div>
  </article>
</template>
