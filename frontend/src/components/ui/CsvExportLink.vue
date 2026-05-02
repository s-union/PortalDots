<script setup lang="ts">
defineProps<{
  href: string
  download?: boolean
}>()
</script>

<template>
  <a
    :href="href"
    :download="download || undefined"
    class="inline-flex items-center gap-2 px-2 text-[1.05rem] text-primary transition hover:text-primary-hover hover:no-underline"
  >
    <FaIcon name="file-csv" fixed-width />
    <slot />
  </a>
</template>
