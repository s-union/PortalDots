<script setup lang="ts">
import { cn } from '@/lib/ui/cn'

const { class: className } = defineProps<{
  class?: string
}>()
</script>

<template>
  <section :class="cn('mx-auto w-full max-w-[1024px] space-y-6 max-[1000px]:px-4', className)">
    <slot />
  </section>
</template>
