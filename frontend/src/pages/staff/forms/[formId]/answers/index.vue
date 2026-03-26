<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    requiresCircle: true,
    staffCapability: 'formAnswers.read'
  }
})

import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import BackLink from '@/components/ui/BackLink.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildDeleteStaffFormAnswerConfirmMessage,
  buildStaffFormAnswersExportUrl,
  buildStaffFormAnswerUploadsZipUrl,
  useDeleteStaffFormAnswerMutation,
  useStaffFormAnswersIndexQuery
} from '@/features/staff/forms/answers'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'

const route = useRoute('/staff/forms/[formId]/answers/')
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const answersQuery = useStaffFormAnswersIndexQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null)
)
const deleteAnswerMutation = useDeleteStaffFormAnswerMutation(formId)

const exportUrl = computed(() => buildStaffFormAnswersExportUrl(formId.value))
const uploadsZipUrl = computed(() => buildStaffFormAnswerUploadsZipUrl(formId.value))
const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'answers'))

// ページネーション
const page = ref(1)
const pageSize = ref(25)

// ソート
const sortKey = ref('createdAt')
const sortDirection = ref<'asc' | 'desc'>('desc')

// 動的列定義（フォーム設問を含む）
const columns = computed<StaffDataGridColumn[]>(() => {
  const base: StaffDataGridColumn[] = [
    { key: 'id', label: '回答ID', sortable: true },
    { key: 'circle', label: '提出した企画', sortable: false },
    { key: 'createdAt', label: '作成日時', sortable: true },
    { key: 'updatedAt', label: '更新日時', sortable: true }
  ]
  const questionCols: StaffDataGridColumn[] = (answersQuery.data.value?.form.questions ?? [])
    .filter((q) => q.type !== 'heading')
    .map((q) => ({
      key: `question_${q.id}`,
      label: q.name,
      sortable: false
    }))
  return [...base, ...questionCols]
})

// ソート済み回答一覧
const sortedAnswers = computed(() => {
  const answers = answersQuery.data.value?.answers ?? []
  const key = sortKey.value
  const dir = sortDirection.value
  return [...answers].sort((a, b) => {
    let av = ''
    let bv = ''
    if (key === 'id') {
      av = a.id
      bv = b.id
    } else if (key === 'createdAt') {
      av = a.createdAt
      bv = b.createdAt
    } else if (key === 'updatedAt') {
      av = a.updatedAt
      bv = b.updatedAt
    }
    if (av < bv) {
      return dir === 'asc' ? -1 : 1
    }
    if (av > bv) {
      return dir === 'asc' ? 1 : -1
    }
    return 0
  })
})

// ページネーション後の行データ
const rows = computed<StaffDataGridRow[]>(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedAnswers.value.slice(start, end).map((answer) => {
    const row: StaffDataGridRow = {
      id: answer.id,
      circle: answer.circle,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
      _groupName: answer.circle.groupName
    }
    for (const question of answersQuery.data.value?.form.questions ?? []) {
      if (question.type === 'heading') {
        continue
      }
      const values = answer.details[question.id] ?? []
      row[`question_${question.id}`] = values.join(', ')
    }
    return row
  })
})

const total = computed(() => sortedAnswers.value.length)

function handleSort(key: string) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }
  page.value = 1
}

async function handleDelete(answerId: string, groupName: string) {
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffFormAnswerConfirmMessage(groupName))) {
    return
  }
  await deleteAnswerMutation.mutateAsync(String(answerId))
}
</script>

<template>
  <PageLayout>
    <BackLink :to="`/staff/forms/${formId}/edit`"> フォーム詳細へ戻る </BackLink>

    <TabStrip :tabs="staffFormTabs" />

    <div v-if="answersQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="answersQuery.data.value" class="space-y-6">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Form Answers</p>
        <SurfaceHeader>
          <template #title>{{ answersQuery.data.value.form.name }}</template>
          <template #description>
            回答数 {{ answersQuery.data.value.answers.length }} / 未回答企画
            {{ answersQuery.data.value.notAnsweredCircles.length }}
          </template>
          <template #actions>
            <div class="flex flex-wrap gap-3">
              <RouterLink
                :to="`/staff/forms/${formId}/answers/create`"
                class="rounded bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                新規回答
              </RouterLink>
              <a
                :href="exportUrl"
                class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              >
                CSV 出力
              </a>
              <RouterLink
                :to="`/staff/forms/${formId}/answers/uploads`"
                class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              >
                ファイルを一括ダウンロード
              </RouterLink>
              <RouterLink
                :to="`/staff/forms/${formId}/not_answered`"
                class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              >
                未提出企画を表示
              </RouterLink>
            </div>
          </template>
        </SurfaceHeader>
      </SurfaceCard>

      <SurfaceCard>
        <StaffDataGrid
          :rows="rows"
          :columns="columns"
          :page="page"
          :page-size="pageSize"
          :total="total"
          :loading="answersQuery.isFetching.value"
          :sort-key="sortKey"
          :sort-direction="sortDirection"
          table-label="回答一覧"
          empty-message="まだ回答はありません。"
          @first="page = 1"
          @prev="page = Math.max(1, page - 1)"
          @next="page = Math.min(Math.ceil(total / pageSize), page + 1)"
          @last="page = Math.ceil(total / pageSize)"
          @reload="answersQuery.refetch()"
          @sort="handleSort"
          @update:page-size="
            (n) => {
              pageSize = n
              page = 1
            }
          "
        >
          <template #actions="{ row }">
            <div class="flex items-center gap-1">
              <RouterLink
                :to="`/staff/forms/${formId}/answers/${row.id}/edit`"
                class="inline-flex h-8 w-8 items-center justify-center rounded text-body transition hover:bg-primary-light hover:text-primary"
                title="編集"
              >
                <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
              </RouterLink>
              <button
                class="inline-flex h-8 w-8 items-center justify-center rounded text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                title="削除"
                :disabled="deleteAnswerMutation.isPending.value"
                @click="handleDelete(String(row.id), String(row._groupName))"
              >
                <i class="fas fa-trash fa-fw" aria-hidden="true" />
              </button>
            </div>
          </template>

          <template #cell-circle="{ value }">
            <span v-if="value && typeof value === 'object' && 'name' in value">
              <span class="font-semibold">{{ (value as unknown as { name: string }).name }}</span>
              <span class="ml-1 text-muted-2">
                — {{ (value as unknown as { groupName: string }).groupName }} (企画ID:
                {{ (value as unknown as { id: string }).id }})
              </span>
            </span>
          </template>
        </StaffDataGrid>
      </SurfaceCard>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      回答一覧を取得できませんでした。
    </div>
  </PageLayout>
</template>
