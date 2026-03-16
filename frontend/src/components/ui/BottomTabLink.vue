<script setup lang="ts">
import { bottomTabLabelVariants, bottomTabLinkVariants } from "@/lib/ui/variants";

defineProps<{
  to: string;
  label: string;
  iconClass?: string;
  active?: boolean;
  showNotifier?: boolean;
}>();
</script>

<template>
  <RouterLink :to="to" :class="bottomTabLinkVariants({ active })">
    <i
      v-if="iconClass"
      :class="[iconClass, 'mb-2 block text-[1.4rem] leading-none']"
      aria-hidden="true"
    />
    <span :class="[bottomTabLabelVariants({ active }), 'inline-flex items-center gap-1']">
      <i v-if="showNotifier" class="fas fa-circle scale-[0.75] text-primary" aria-hidden="true" />
      {{ label }}
    </span>
  </RouterLink>
</template>
