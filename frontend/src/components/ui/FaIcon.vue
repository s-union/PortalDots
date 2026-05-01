<script setup lang="ts">
import { computed } from 'vue'
import { findIconDefinition, icon, type IconName, type IconPrefix } from '@fortawesome/fontawesome-svg-core'

const {
  name,
  prefix = 'fas',
  fixedWidth = false,
  pulse = false,
  className = ''
} = defineProps<{
  name: string
  prefix?: IconPrefix
  fixedWidth?: boolean
  pulse?: boolean
  className?: string
}>()

const svgHtml = computed(() => {
  const definition = findIconDefinition({ prefix, iconName: name as IconName })
  if (!definition) {
    return ''
  }

  const classes = [fixedWidth ? 'fa-fw' : '', pulse ? 'fa-pulse' : '', className].filter(Boolean).join(' ')

  return icon(definition, {
    classes: classes.split(/\s+/).filter(Boolean),
    attributes: {
      'aria-hidden': 'true',
      focusable: 'false'
    }
  }).html.join('')
})
</script>

<template>
  <span class="inline-flex shrink-0 items-center justify-center leading-none" v-html="svgHtml" />
</template>
