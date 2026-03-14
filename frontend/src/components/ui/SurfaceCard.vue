<script setup lang="ts">
withDefaults(
  defineProps<{
    tag?: string;
    overflowHidden?: boolean;
  }>(),
  {
    tag: "section",
    overflowHidden: false,
  },
);
</script>

<template>
  <component
    :is="tag"
    :class="[
      'rounded border border-border bg-surface shadow-lv1',
      overflowHidden ? 'overflow-hidden' : '',
    ]"
  >
    <slot />
  </component>
</template>
