<script setup lang="ts">
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'

interface Action {
  label: string
  to: string
  variant?: 'primary' | 'secondary'
}

interface Props {
  title: string
  lead: string
  body: string
  notes?: string[]
  actions: Action[]
}

const { title, lead, body, notes = [], actions } = defineProps<Props>()

function actionClasses(variant: Action['variant'] = 'secondary') {
  if (variant === 'primary') {
    return 'inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover'
  }

  return 'inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-body transition hover:bg-surface-light'
}
</script>

<template>
  <section class="mx-auto max-w-3xl py-8">
    <SurfaceCard>
      <SurfaceCardBand>
        <h2 class="text-2xl font-bold text-body">{{ title }}</h2>
      </SurfaceCardBand>

      <div class="space-y-4 px-6 py-6 text-sm leading-7">
        <p class="text-base font-semibold text-body">{{ lead }}</p>
        <p class="text-muted">{{ body }}</p>

        <div v-if="notes.length > 0" class="rounded-lg bg-surface-light px-4 py-3 text-muted">
          <ul class="list-disc space-y-1.5 pl-5">
            <li v-for="note in notes" :key="note">{{ note }}</li>
          </ul>
        </div>

        <div class="flex flex-wrap justify-center gap-3 pt-4">
          <RouterLink
            v-for="action in actions"
            :key="`${action.label}:${action.to}`"
            :class="actionClasses(action.variant)"
            :to="action.to"
          >
            {{ action.label }}
          </RouterLink>
        </div>
      </div>
    </SurfaceCard>
  </section>
</template>
