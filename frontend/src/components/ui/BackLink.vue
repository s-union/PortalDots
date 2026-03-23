<script setup lang="ts">
import { buttonVariants } from '@/lib/ui/variants'

const { to } = defineProps<{
  to: string
}>()
</script>

<template>
  <RouterLink :to="to" :class="buttonVariants({ variant: 'secondary', size: 'md' })">
    <slot />
  </RouterLink>
</template>
