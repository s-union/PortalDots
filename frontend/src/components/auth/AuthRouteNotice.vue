<script setup lang="ts">
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'

interface Action {
  label: string
  to: string
  variant?: 'primary' | 'secondary'
}

interface Props {
  eyebrow?: string
  title: string
  lead: string
  body: string
  notes?: string[]
  actions: Action[]
}

const { eyebrow = 'Auth', title, lead, body, notes = [], actions } = defineProps<Props>()

function actionClasses(variant: Action['variant'] = 'secondary') {
  if (variant === 'primary') {
    return 'inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover'
  }

  return 'inline-flex rounded border border-border px-4 py-3 font-semibold text-body transition hover:bg-surface-light'
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6 py-8">
    <SurfaceCard>
      <SurfaceCardBand>
        <p class="text-sm text-primary">{{ eyebrow }}</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">{{ title }}</h2>
      </SurfaceCardBand>

      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>{{ lead }}</p>
        <p>{{ body }}</p>

        <ul v-if="notes.length > 0" class="list-disc space-y-2 pl-5 text-muted">
          <li v-for="note in notes" :key="note">{{ note }}</li>
        </ul>

        <div class="flex flex-wrap gap-3">
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
