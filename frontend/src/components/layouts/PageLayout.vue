<script setup lang="ts">
import PageContentContainer from '@/components/ui/PageContentContainer.vue'

const { class: className } = defineProps<{
  class?: string
}>()
</script>

<template>
  <PageContentContainer :class="className">
    <slot />
  </PageContentContainer>
</template>
