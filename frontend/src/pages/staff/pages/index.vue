<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'pages.read'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BackLink from '@/components/ui/BackLink.vue'
import LoadingMessage from '@/components/ui/LoadingMessage.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import { buildStaffPagesExportUrl, useStaffPagesQuery } from '@/features/staff/pages/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const searchQuery = ref(String(route.query.query ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const pagesQuery = useStaffPagesQuery(searchQuery, enabled)
const exportHref = computed(() => buildStaffPagesExportUrl())

watch(
  () => route.query.query,
  (value) => {
    searchQuery.value = String(value ?? '')
  }
)

async function handleSearchSubmit() {
  const normalizedQuery = searchQuery.value.trim()
  await router.replace({
    query: normalizedQuery === '' ? {} : { query: normalizedQuery }
  })
}
</script>

<template>
  <PageLayout>
    <PageHeader title="お知らせ管理" description="企画に依存しない共通のお知らせを管理します。">
      <template #actions>
        <BackLink to="/staff">Staff top へ戻る</BackLink>
      </template>
    </PageHeader>

    <SurfaceCard>
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div class="flex flex-wrap gap-2">
          <RouterLink
            class="rounded bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
            to="/staff/pages/create"
          >
            新規作成
          </RouterLink>
          <RouterLink
            class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
            to="/staff/mails"
          >
            メール配信設定
          </RouterLink>
          <a
            :href="exportHref"
            class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          >
            CSVで出力
          </a>
        </div>

        <form class="flex min-w-80 flex-1 flex-wrap gap-3 sm:justify-end" @submit.prevent="handleSearchSubmit">
          <input
            v-model="searchQuery"
            class="min-w-64 flex-1"
            name="query"
            placeholder="お知らせを検索..."
            type="search"
          />
          <button
            class="rounded bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
            type="submit"
          >
            検索
          </button>
        </form>
      </div>

      <LoadingMessage v-if="pagesQuery.isPending.value" />

      <div v-else-if="(pagesQuery.data.value?.length ?? 0) === 0" class="px-6 py-6 text-sm text-muted">
        お知らせは見つかりませんでした。
      </div>

      <div v-else class="divide-y divide-border">
        <article v-for="page in pagesQuery.data.value" :key="page.id" class="px-6 py-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-2">
              <RouterLink :to="`/staff/pages/${page.id}`" class="text-lg font-semibold text-primary hover:underline">
                {{ page.title }}
              </RouterLink>
              <div class="flex flex-wrap gap-2">
                <StatusBadge :tone="page.isPublic ? 'success' : 'muted'" appearance="outlined">
                  {{ page.isPublic ? '公開中' : '非公開' }}
                </StatusBadge>
                <StatusBadge :tone="page.isPinned ? 'primary' : 'muted'" appearance="outlined">
                  {{ page.isPinned ? '固定表示' : '通常表示' }}
                </StatusBadge>
                <StatusBadge :tone="page.viewableTags.length > 0 ? 'primary' : 'muted'" appearance="outlined">
                  {{ page.viewableTags.length > 0 ? '限定公開' : '全員に公開' }}
                </StatusBadge>
              </div>
            </div>

            <RouterLink :to="`/staff/pages/${page.id}`" class="text-sm font-semibold text-primary hover:underline">
              編集
            </RouterLink>
          </div>

          <div class="mt-4 grid gap-3 text-sm text-muted">
            <p v-if="page.notes !== ''">{{ page.notes }}</p>
            <p>閲覧タグ: {{ page.viewableTags.length > 0 ? page.viewableTags.join(', ') : 'なし' }}</p>
            <p>
              関連資料:
              {{ page.documents.length > 0 ? page.documents.map((document) => document.name).join(', ') : 'なし' }}
            </p>
            <p>作成日時: {{ formatDateTimeUpdated(page.createdAt) }}</p>
            <p>更新日時: {{ formatDateTimeUpdated(page.updatedAt) }}</p>
          </div>
        </article>
      </div>
    </SurfaceCard>
  </PageLayout>
</template>
