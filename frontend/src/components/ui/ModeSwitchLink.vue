<script setup lang="ts">
import { buttonVariants } from "@/lib/ui/variants";

defineProps<{
  to: string;
  label: string;
}>();
</script>

<template>
  <RouterLink
    :to="to"
    :class="buttonVariants({ variant: 'primary', size: 'lg', weight: 'semibold' })"
  >
    {{ label }}
  </RouterLink>
</template>
