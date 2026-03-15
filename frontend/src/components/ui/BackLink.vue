<script setup lang="ts">
import { buttonVariants } from "@/lib/ui/variants";

defineProps<{
  to: string;
}>();
</script>

<template>
  <RouterLink :to="to" :class="buttonVariants({ variant: 'secondary', size: 'md' })">
    <slot />
  </RouterLink>
</template>
