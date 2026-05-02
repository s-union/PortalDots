<script setup lang="ts">
const { title, meta } = defineProps<{
  title: string
  meta: string
}>()
</script>

<template>
  <article
    class="relative overflow-hidden rounded-lg border border-transparent border-l-4 border-l-primary bg-surface transition-all duration-200 hover:z-10 hover:border-primary hover:shadow-lv1"
  >
    <div class="p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">{{ meta }}</p>
          <h4 class="mt-1.5 text-lg font-semibold text-body">{{ title }}</h4>
        </div>
        <div class="flex flex-wrap gap-2">
          <slot name="actions" />
        </div>
      </div>

      <div class="mt-5 grid gap-4">
        <slot />
      </div>
    </div>
  </article>
</template>
