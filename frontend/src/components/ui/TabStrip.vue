<script setup lang="ts">
type TabItem = {
  label: string;
  active?: boolean;
  href?: string;
};

defineProps<{
  tabs: TabItem[];
}>();
</script>

<template>
  <div class="flex flex-wrap gap-2 border-b border-border text-sm">
    <component
      v-for="tab in tabs"
      :key="tab.label"
      :is="tab.href ? 'a' : 'span'"
      :href="tab.href"
      class="rounded-t border px-4 py-2"
      :class="
        tab.active
          ? 'border-border border-b-transparent bg-surface text-body'
          : 'border-border bg-surface-light text-muted'
      "
    >
      {{ tab.label }}
    </component>
  </div>
</template>
