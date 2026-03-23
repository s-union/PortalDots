<script setup lang="ts">
import { computed } from 'vue'

const {
  to = '',
  href = '',
  newTab = false,
  legacy = false
} = defineProps<{
  to?: string
  href?: string
  newTab?: boolean
  legacy?: boolean
}>()

const rootClass = computed(() =>
  legacy
    ? 'block px-6 py-[1.2rem] text-body transition hover:bg-form-control max-[1000px]:px-4'
    : 'block px-6 py-5 transition hover:bg-form-control'
)
const titleClass = computed(() =>
  legacy ? 'text-base font-semibold leading-[1.4] text-body' : 'text-base font-semibold text-body'
)
const metaClass = computed(() => (legacy ? 'text-base text-muted' : 'mt-2 text-sm text-muted'))
const bodyClass = computed(() =>
  legacy ? 'mt-1 text-base leading-[1.7] text-muted' : 'mt-3 text-sm leading-7 text-body'
)
</script>

<template>
  <component
    :is="to ? 'RouterLink' : href ? 'a' : 'div'"
    :to="to || undefined"
    :href="href || undefined"
    :target="newTab ? '_blank' : undefined"
    :rel="newTab ? 'noreferrer' : undefined"
    :class="rootClass"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <slot name="prefix" />
          <h3 :class="titleClass">
            <slot name="title" />
          </h3>
          <slot name="suffix" />
        </div>
        <div v-if="$slots.meta" :class="metaClass">
          <slot name="meta" />
        </div>
        <div v-if="$slots.default" :class="bodyClass">
          <slot />
        </div>
      </div>
      <div v-if="$slots.right">
        <slot name="right" />
      </div>
    </div>
  </component>
</template>
