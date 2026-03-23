<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListPanel from '@/components/ui/ListPanel.vue'
import { resolveCircleSelectorDestination, sanitizeCircleSelectorCircleId } from '@/app/router/circleSelectorRedirect'
import { useSelectableCirclesQuery, useSelectCurrentCircleMutation } from '@/features/circles/api'
import { useParticipationTypesQuery } from '@/features/participation-types/api'
import { useSessionStore } from '@/features/session/store'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const circlesQuery = useSelectableCirclesQuery()
const participationTypesQuery = useParticipationTypesQuery(true)
const selectCircleMutation = useSelectCurrentCircleMutation()

const isSelecting = computed(() => selectCircleMutation.isPending.value)
const redirectDestination = computed(() => {
  const redirect = route.query.redirect
  return resolveCircleSelectorDestination(typeof redirect === 'string' ? redirect : undefined)
})
const requestedCircleId = computed(() => {
  const circle = route.query.circle
  return sanitizeCircleSelectorCircleId(typeof circle === 'string' ? circle : undefined)
})
const hasTriedAutoSelect = ref(false)
const participationTypeCards = computed(() => participationTypesQuery.data.value ?? [])

async function handleSelectCircle(circleId: string) {
  await selectCircleMutation.mutateAsync(circleId)
  await router.push(redirectDestination.value)
}

watch(
  [requestedCircleId, () => circlesQuery.data.value, () => circlesQuery.isPending.value],
  async ([circleId, circles, isPending]) => {
    if (hasTriedAutoSelect.value || !circleId || isPending) {
      return
    }

    hasTriedAutoSelect.value = true

    if (!(circles ?? []).some((circle) => circle.id === circleId)) {
      return
    }

    await handleSelectCircle(circleId)
  },
  { immediate: true }
)
</script>

<template>
  <section class="space-y-6">
    <ListPanel
      title="作業対象の企画を選択します。"
      :description="
        redirectDestination === '/workspace'
          ? 'ここで選んだ企画コンテキストで以後の画面が動きます。'
          : requestedCircleId
            ? '指定された企画を確認できれば自動で選択し、元の画面へ戻ります。'
            : '企画選択後は、元の画面へ戻ってそのまま作業を続けられます。'
      "
    >
      <div v-if="circlesQuery.isPending.value" class="px-6 py-6 text-sm text-muted">読み込み中...</div>

      <div v-else class="divide-y divide-border">
        <button
          v-for="circle in circlesQuery.data.value"
          :key="circle.id"
          class="w-full px-6 py-5 text-left transition hover:bg-form-control disabled:opacity-50"
          :class="sessionStore.currentCircle?.id === circle.id ? 'bg-primary-light' : ''"
          :disabled="isSelecting"
          type="button"
          @click="handleSelectCircle(circle.id)"
        >
          <p class="text-base font-semibold text-body">{{ circle.name }}</p>
          <p class="mt-2 text-sm text-muted">{{ circle.groupName }} / {{ circle.participationTypeName }}</p>
        </button>
      </div>
    </ListPanel>

    <ListPanel
      title="別の企画を参加登録する"
      description="参加種別ごとに新しい企画を作成します。作成後はワークスペースで続けて編集できます。"
    >
      <div v-if="participationTypesQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        参加種別を読み込み中...
      </div>

      <div v-else class="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
        <RouterLink
          v-for="participationType in participationTypeCards"
          :key="participationType.id"
          :to="{
            path: '/circles/new',
            query: { participation_type: participationType.id }
          }"
          class="rounded-lg border border-border bg-background px-5 py-5 transition hover:border-primary hover:bg-primary-light"
        >
          <p class="text-base font-semibold text-body">{{ participationType.name }}</p>
          <p class="mt-2 text-sm text-primary">{{ participationType.form.closeAt }} まで受付</p>
          <p class="mt-2 text-sm leading-6 text-muted">{{ participationType.description }}</p>
        </RouterLink>
      </div>
    </ListPanel>
  </section>
</template>
