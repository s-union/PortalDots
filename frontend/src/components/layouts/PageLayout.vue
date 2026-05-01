<script setup lang="ts">
import PageContentContainer from '@/components/ui/PageContentContainer.vue'
import { cn } from '@/lib/ui/cn'

const { class: className, spacious = false } = defineProps<{
  class?: string
  spacious?: boolean
}>()
</script>

<template>
  <PageContentContainer :class="cn(spacious && 'py-6 md:py-8', className)">
    <slot />
  </PageContentContainer>
</template>
