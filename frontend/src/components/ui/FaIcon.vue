<script setup lang="ts">
import { computed } from 'vue'
import type { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core'
import { findIconDefinition } from '@/lib/icons/fontawesome'
import '@fortawesome/fontawesome-svg-core/styles.css'

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

const definition = computed(() => {
  const iconPrefix = parsedIconClass.value?.prefix ?? prefix
  const iconName = parsedIconClass.value?.iconName ?? name
  return iconName ? findIconDefinition(iconPrefix, iconName) : undefined
})

const svgClasses = computed(() =>
  [
    'svg-inline--fa',
    definition.value ? `fa-${definition.value.iconName}` : '',
    fixedWidth || parsedIconClass.value?.fixedWidth ? 'fa-fw' : '',
    pulse || parsedIconClass.value?.pulse ? 'fa-pulse' : '',
    ...(parsedIconClass.value?.extraClasses ?? []),
    className
  ]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
)
</script>

<template>
  <span class="inline-flex shrink-0 items-center justify-center leading-none">
    <svg
      v-if="definition"
      aria-hidden="true"
      focusable="false"
      :data-prefix="definition.prefix"
      :data-icon="definition.iconName"
      :class="svgClasses"
      role="img"
      :viewBox="`0 0 ${definition.icon[0]} ${definition.icon[1]}`"
    >
      <g v-if="Array.isArray(definition.icon[4])" class="fa-duotone-group">
        <path class="fa-secondary" fill="currentColor" :d="definition.icon[4][0]" />
        <path class="fa-primary" fill="currentColor" :d="definition.icon[4][1]" />
      </g>
      <path v-else fill="currentColor" :d="definition.icon[4]" />
    </svg>
  </span>
</template>
