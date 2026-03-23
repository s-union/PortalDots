<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'activityLogs.read'
  }
})

import { computed, ref } from 'vue'
import BackLink from '@/components/ui/BackLink.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffActivityLogsQuery } from '@/features/staff/admin/activityLogs'
import { useSessionStore } from '@/features/session/store'
import { calculateTotalPages } from '@/lib/pagination'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const page = ref(1)
const pageSize = 10
const activityLogsQuery = useStaffActivityLogsQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: page.value,
    pageSize
  }))
)
const totalPages = computed(() =>
  calculateTotalPages(activityLogsQuery.data.value?.total ?? 0, activityLogsQuery.data.value?.pageSize ?? pageSize)
)

function movePage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), totalPages.value)
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div>
        <p class="text-sm text-primary">Staff Activity Logs</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">活動ログ</h2>
        <p class="mt-3 text-sm leading-7 text-muted">staff 操作の主要な mutation を時系列で確認します。</p>
      </div>
      <BackLink to="/staff"> Staff top へ戻る </BackLink>
    </header>

    <SurfaceCard overflow-hidden>
      <SurfaceHeader>
        <template #title>
          アクティビティログ
          <span class="rounded-full bg-surface-light px-2 py-1 text-xs text-muted">BETA</span>
        </template>
        <template #description>
          「アクティビティログ」では、PortalDots 内で行われた各種データ操作の履歴を確認できます。
        </template>
      </SurfaceHeader>

      <div v-if="activityLogsQuery.isPending.value" class="px-6 py-5 text-sm text-muted">読み込み中...</div>

      <div v-else-if="(activityLogsQuery.data.value?.items.length ?? 0) === 0" class="px-6 py-5 text-sm text-muted">
        まだ活動ログはありません。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-border text-sm">
          <thead class="bg-surface-light text-left text-muted-2">
            <tr>
              <th class="px-5 py-3 font-medium">種別</th>
              <th class="px-5 py-3 font-medium">概要</th>
              <th class="px-5 py-3 font-medium">実施者</th>
              <th class="px-5 py-3 font-medium">対象</th>
              <th class="px-5 py-3 font-medium">circle</th>
              <th class="px-5 py-3 font-medium">実施日時</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="entry in activityLogsQuery.data.value?.items" :key="entry.id" class="align-top">
              <td class="px-5 py-4">
                <span class="rounded-full bg-primary-light px-3 py-1 text-xs text-primary">
                  {{ entry.action }}
                </span>
              </td>
              <td class="px-5 py-4 text-body">{{ entry.summary }}</td>
              <td class="px-5 py-4 text-muted">{{ entry.actorUserId }}</td>
              <td class="px-5 py-4 text-muted">{{ entry.targetType }} / {{ entry.targetId }}</td>
              <td class="px-5 py-4 text-muted">{{ entry.circleId || 'global' }}</td>
              <td class="px-5 py-4 text-muted">{{ entry.createdAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer
        v-if="activityLogsQuery.data.value && activityLogsQuery.data.value.total > 0"
        class="flex flex-wrap items-center justify-between gap-4 border-t border-border px-5 py-4 text-sm text-muted"
      >
        <p>
          {{ activityLogsQuery.data.value.total }} 件中
          {{ (activityLogsQuery.data.value.page - 1) * activityLogsQuery.data.value.pageSize + 1 }}
          -
          {{
            Math.min(
              activityLogsQuery.data.value.page * activityLogsQuery.data.value.pageSize,
              activityLogsQuery.data.value.total
            )
          }}
          件
        </p>
        <div class="flex items-center gap-3">
          <button
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page <= 1"
            type="button"
            @click="movePage(page - 1)"
          >
            前へ
          </button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page >= totalPages"
            type="button"
            @click="movePage(page + 1)"
          >
            次へ
          </button>
        </div>
      </footer>
    </SurfaceCard>
  </section>
</template>
