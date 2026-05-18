<script setup lang="ts">
import FaIcon from '@/components/ui/FaIcon.vue'
import { bottomTabLabelVariants, bottomTabLinkVariants } from '@/lib/ui/variants'

const { to, label, iconClass, active, showNotifier } = defineProps<{
  to: string
  label: string
  iconClass?: string
  active?: boolean
  showNotifier?: boolean
}>()
</script>

<template>
  <RouterLink :to="to" :class="bottomTabLinkVariants({ active })">
    <FaIcon v-if="iconClass" :icon-class="iconClass" class-name="mb-2 block text-[1.4rem] leading-none" />
    <span :class="[bottomTabLabelVariants({ active }), 'inline-flex items-center gap-1']">
      <FaIcon v-if="showNotifier" name="circle" class-name="scale-[0.75] text-primary" />
      {{ label }}
    </span>
  </RouterLink>
</template>
