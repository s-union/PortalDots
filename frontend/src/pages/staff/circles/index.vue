<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.read'
  }
})

import { computed } from 'vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffParticipationTypesQuery } from '@/features/staff/participation-types/api'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const participationTypesQuery = useStaffParticipationTypesQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
</script>

<template>
  <PageLayout>
    <PageHeader eyebrow="Circles" title="企画管理">
      <template #actions>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
            to="/staff/circles/all"
          >
            すべての企画を表示
          </RouterLink>
          <RouterLink
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
            to="/staff/circles/participation_types"
          >
            参加種別を管理
          </RouterLink>
        </div>
      </template>
    </PageHeader>

    <SurfaceCard>
      <SurfaceHeader>
        <template #title>参加種別から探す</template>
      </SurfaceHeader>
      <div v-if="participationTypesQuery.isPending.value" class="px-6 py-5 text-sm text-muted">読み込み中...</div>
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
              <p class="mt-1 text-sm text-muted">{{ participationType.description }}</p>
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
