<script setup lang="ts">
definePage({
  path: '/staff/circles',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.read'
  }
})

import { computed } from 'vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import { canManageParticipationTypes } from '@/features/staff/access/capabilities'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffParticipationTypesQuery } from '@/features/staff/participation-types/api'
import { useSessionStore } from '@/features/session/store'
import { formatDateTime } from '@/lib/format/datetime'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const canManageParticipationType = computed(() =>
  canManageParticipationTypes(sessionStore.roles, sessionStore.permissions)
)
const participationTypesQuery = useStaffParticipationTypesQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true && canManageParticipationType.value)
)
</script>

<template>
  <PageLayout>
    <SurfaceCard>
      <SurfaceHeader>
        <template #title>参加種別</template>
        <template #actions>
          <div class="flex flex-wrap gap-3">
            <RouterLink
              class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              to="/staff/circles/all"
            >
              すべての企画を表示
            </RouterLink>
            <RouterLink
              v-if="canManageParticipationType"
              class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              to="/staff/circles/participation_types"
            >
              + 参加種別を作成
            </RouterLink>
          </div>
        </template>
      </SurfaceHeader>
      <div v-if="!canManageParticipationType" class="px-6 py-5 text-sm text-muted">
        参加種別の管理権限がないため、詳細一覧は表示されません。
      </div>
      <div v-else-if="participationTypesQuery.isPending.value" class="px-6 py-5 text-sm text-muted">読み込み中...</div>
      <div v-else-if="(participationTypesQuery.data.value?.length ?? 0) === 0" class="px-6 py-5 text-sm text-muted">
        参加種別はまだありません。
      </div>
      <div v-else class="divide-y divide-border">
        <RouterLink
          v-for="participationType in participationTypesQuery.data.value"
          :key="participationType.id"
          :to="`/staff/circles/participation_types/${participationType.id}`"
          class="block px-6 py-5 transition hover:bg-surface-light"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-medium text-body">{{ participationType.name }}</h3>
              <p class="mt-2 text-sm text-muted">
                {{ participationType.form.isOpen ? '受付期間内' : '受付期間外' }}
              </p>
              <p class="mt-1 text-sm text-muted">
                受付期間 : {{ formatDateTime(participationType.form.openAt) }}〜{{
                  formatDateTime(participationType.form.closeAt)
                }}
              </p>
              <p v-if="participationType.description" class="mt-2 text-sm text-muted">
                {{ participationType.description }}
              </p>
            </div>
            <StatusBadge tone="primary">
              {{ participationType.usersCountMin }} - {{ participationType.usersCountMax }} 人
            </StatusBadge>
          </div>
        </RouterLink>
      </div>
    </SurfaceCard>
  </PageLayout>
</template>
