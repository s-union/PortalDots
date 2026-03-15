<script setup lang="ts">
import { bottomTabLabelVariants, bottomTabLinkVariants } from "@/lib/ui/variants";

defineProps<{
  to: string;
  label: string;
  icon: string;
  active?: boolean;
}>();
</script>

<template>
  <RouterLink :to="to" :class="bottomTabLinkVariants({ active })">
    <span class="mb-2 block text-[1.4rem] leading-none">{{ icon }}</span>
    <span :class="bottomTabLabelVariants({ active })">
      {{ label }}
    </span>
  </RouterLink>
</template>
