<script setup lang="ts">
import { navMenuLinkVariants } from '@/lib/ui/variants'

const {
  to,
  label,
  iconClass,
  active,
  adminOnly = false
} = defineProps<{
  to: string
  label: string
  iconClass?: string
  active?: boolean
  adminOnly?: boolean
}>()
</script>

<template>
  <RouterLink :to="to" :class="navMenuLinkVariants({ active })">
    <!-- Active indicator: right-side 4px vertical bar (replaces ::before pseudo-element) -->
    <span v-if="active" class="absolute right-0 top-2 bottom-2 w-1 rounded-l bg-primary" aria-hidden="true" />
    <i v-if="iconClass" :class="[iconClass, 'mr-2 text-[1.2rem] opacity-50']" aria-hidden="true" />
    {{ label }}
    <span
      v-if="adminOnly"
      class="ml-2 inline-flex items-center justify-center rounded bg-danger-light px-1.5 text-[0.75em] font-medium leading-[1.75] text-danger"
    >
      管理者
    </span>
  </RouterLink>
</template>
