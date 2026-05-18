<script setup lang="ts">
import { computed } from 'vue'
import { findIconDefinition, icon, type IconName, type IconPrefix } from '@fortawesome/fontawesome-svg-core'

const {
  name,
  prefix = 'fas',
  fixedWidth = false,
  pulse = false,
  className = '',
  iconClass = ''
} = defineProps<{
  name?: IconName
  prefix?: IconPrefix
  fixedWidth?: boolean
  pulse?: boolean
  className?: string
  iconClass?: string
}>()

const parsedIconClass = computed(() => {
  const classes = iconClass.split(/\s+/).filter(Boolean)
  const classPrefix = classes.find((item) => item === 'fas' || item === 'far')
  const iconClassName = classes.find((item) => item.startsWith('fa-') && item !== 'fa-fw' && item !== 'fa-pulse')
  const iconName = iconClassName?.replace(/^fa-/, '')

  if (!classPrefix || !iconName) {
    return null
  }

  return {
    prefix: classPrefix,
    iconName,
    fixedWidth: classes.includes('fa-fw'),
    pulse: classes.includes('fa-pulse'),
    extraClasses: classes.filter(
      (item) => item !== classPrefix && item !== iconClassName && item !== 'fa-fw' && item !== 'fa-pulse'
    )
  }
})

const svgHtml = computed(() => {
  const iconPrefix = parsedIconClass.value?.prefix ?? prefix
  const iconName = parsedIconClass.value?.iconName ?? name
  if (!iconName) {
    return ''
  }

  const definition = findIconDefinition({ prefix: iconPrefix, iconName: iconName as IconName })
  if (!definition) {
    return ''
  }

  const classes = [
    fixedWidth || parsedIconClass.value?.fixedWidth ? 'fa-fw' : '',
    pulse || parsedIconClass.value?.pulse ? 'fa-pulse' : '',
    ...(parsedIconClass.value?.extraClasses ?? []),
    className
  ]
    .filter(Boolean)
    .join(' ')

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
