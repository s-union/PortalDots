<script setup lang="ts">
withDefaults(
  defineProps<{
    to?: string;
    href?: string;
    newTab?: boolean;
  }>(),
  {
    to: "",
    href: "",
    newTab: false,
  },
);
</script>

<template>
  <component
    :is="to ? 'RouterLink' : href ? 'a' : 'div'"
    :to="to || undefined"
    :href="href || undefined"
    :target="newTab ? '_blank' : undefined"
    :rel="newTab ? 'noreferrer' : undefined"
    class="block px-6 py-5 transition hover:bg-form-control"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <slot name="prefix" />
          <h3 class="text-base font-semibold text-body">
            <slot name="title" />
          </h3>
          <slot name="suffix" />
        </div>
        <div v-if="$slots.meta" class="mt-2 text-sm text-muted">
          <slot name="meta" />
        </div>
        <div v-if="$slots.default" class="mt-3 text-sm leading-7 text-body">
          <slot />
        </div>
      </div>
      <div v-if="$slots.right">
        <slot name="right" />
      </div>
    </div>
  </component>
</template>
