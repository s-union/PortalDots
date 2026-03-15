<script setup lang="ts">
import { navMenuLinkVariants } from "@/lib/ui/variants";

defineProps<{
  to: string;
  label: string;
  icon: string;
  active?: boolean;
}>();
</script>

<template>
  <RouterLink :to="to" :class="navMenuLinkVariants({ active })">
    <!-- Active indicator: right-side 4px vertical bar (replaces ::before pseudo-element) -->
    <span
      v-if="active"
      class="absolute right-0 top-2 bottom-2 w-1 rounded-l bg-primary"
      aria-hidden="true"
    />
    <span class="mr-2 text-[1.2rem] opacity-50">{{ icon }}</span>
    {{ label }}
  </RouterLink>
</template>
