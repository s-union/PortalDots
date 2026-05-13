<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListPanel from '@/components/ui/ListPanel.vue'
import LoadingMessage from '@/components/ui/LoadingMessage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import { resolveCircleSelectorDestination, sanitizeCircleSelectorCircleId } from '@/app/router/circleSelectorRedirect'
import { useSelectableCirclesQuery, useSelectCurrentCircleMutation } from '@/features/circles/api'
import { useParticipationTypesQuery } from '@/features/participation-types/api'
import { useSessionStore } from '@/features/session/store'
import PageLayout from '@/components/layouts/PageLayout.vue'
import PanelBody from '@/components/ui/PanelBody.vue'
import { formatDateTime } from '@/lib/format/datetime'
import { optionalRouteString } from '@/lib/routeQuery'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const circlesQuery = useSelectableCirclesQuery()
const canCreateCircleRegistration = computed(() => sessionStore.user?.canCreateCircleRegistration !== false)
const participationTypesQuery = useParticipationTypesQuery(canCreateCircleRegistration)
const selectCircleMutation = useSelectCurrentCircleMutation()

const isSelecting = computed(() => selectCircleMutation.isPending.value)
const redirectDestination = computed(() => {
  return resolveCircleSelectorDestination(optionalRouteString(route.query.redirect))
})
const requestedCircleId = computed(() => {
  return sanitizeCircleSelectorCircleId(optionalRouteString(route.query.circle))
})
const hasTriedAutoSelect = ref(false)
const participationTypeCards = computed(() =>
  canCreateCircleRegistration.value ? (participationTypesQuery.data.value ?? []) : []
)

const unsubmittedCircles = computed(() => (circlesQuery.data.value ?? []).filter((circle) => !circle.submittedAt))

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
  <PageLayout spacious>
    <ListPanel
      legacy
      title="作業対象の企画を選択します。"
      :description="
        redirectDestination === '/'
          ? 'ここで選んだ企画コンテキストで以後の画面が動きます。'
          : requestedCircleId
            ? '指定された企画を確認できれば自動で選択し、元の画面へ戻ります。'
            : '企画選択後は、元の画面へ戻ってそのまま作業を続けられます。'
      "
    >
      <LoadingMessage v-if="circlesQuery.isPending.value" />

      <PanelBody v-else-if="(circlesQuery.data.value?.length ?? 0) === 0" class="text-sm leading-7 text-muted">
        該当する企画はありません。
      </PanelBody>

      <template v-else>
        <AlertMessage v-if="unsubmittedCircles.length > 0" tone="info">
          <p class="font-semibold">まだ提出されていない企画があります。</p>
          <p class="mt-1">締切までに参加登録の提出を完了してください。</p>
        </AlertMessage>

        <div class="divide-y divide-border">
          <button
            v-for="circle in circlesQuery.data.value"
            :key="circle.id"
            class="w-full px-5 py-5 text-left transition hover:bg-form-control disabled:opacity-50 sm:px-7 sm:py-6"
            :class="sessionStore.currentCircle?.id === circle.id ? 'bg-primary-light' : ''"
            :disabled="isSelecting"
            type="button"
            @click="handleSelectCircle(circle.id)"
          >
            <p class="text-base font-semibold text-body">{{ circle.name }}</p>
            <p class="mt-2 text-sm text-muted">{{ circle.groupName }} / {{ circle.participationTypeName }}</p>
          </button>
        </div>
      </template>
    </ListPanel>

    <ListPanel
      v-if="canCreateCircleRegistration"
      legacy
      title="別の企画を参加登録する"
      description="参加種別ごとに新しい企画を作成します。作成後はワークスペースで続けて編集できます。"
    >
      <LoadingMessage v-if="participationTypesQuery.isPending.value" message="参加種別を読み込み中..." />

      <PanelBody v-else spacious class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <RouterLink
          v-for="participationType in participationTypeCards"
          :key="participationType.id"
          :to="{
            path: '/circles/new',
            query: { participation_type: participationType.id }
          }"
          class="rounded-lg border border-border bg-background px-5 py-5 transition hover:border-primary hover:bg-primary-light sm:px-6 sm:py-6"
        >
          <p class="text-base font-semibold text-body">{{ participationType.name }}</p>
          <p class="mt-2 text-sm text-primary">{{ formatDateTime(participationType.form.closeAt) }} まで受付</p>
          <p class="mt-2 text-sm leading-6 text-muted">{{ participationType.description }}</p>
        </RouterLink>
      </PanelBody>
    </ListPanel>
  </PageLayout>
</template>
