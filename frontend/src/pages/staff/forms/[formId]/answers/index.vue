<script setup lang="ts">
definePage({
  path: '/staff/forms/:formId/answers',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'formAnswers.read'
  }
})

import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
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
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'

const route = useRoute('/staff/forms/[formId]/answers/')
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const answersQuery = useStaffFormAnswersIndexQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const deleteAnswerMutation = useDeleteStaffFormAnswerMutation(formId)

const exportUrl = computed(() => buildStaffFormAnswersExportUrl(formId.value))
const uploadsZipUrl = computed(() => buildStaffFormAnswerUploadsZipUrl(formId.value))
const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'answers'))
const currentForm = computed(() => answersQuery.data.value?.form ?? null)
const showNotAnsweredLink = computed(() => currentForm.value?.isParticipationForm !== true)

const answersSortKeys = ['id', 'createdAt', 'updatedAt'] as const
type AnswersSortKey = (typeof answersSortKeys)[number]
const isAnswersSortKey = createSortKeyGuard(answersSortKeys)
const sort = useSortState<AnswersSortKey>('id')

// 動的列定義（フォーム設問を含む）
const columns = computed<StaffDataGridColumn[]>(() => {
  const base: StaffDataGridColumn[] = [
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
  const key = sort.sortKey.value
  const dir = sort.sortDirection.value
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

const pagination = usePaginationState(computed(() => sortedAnswers.value.length))

// ページネーション後の行データ
const rows = computed<StaffDataGridRow[]>(() => {
  const start = (pagination.page.value - 1) * pagination.pageSize.value
  const end = start + pagination.pageSize.value
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

function handleSort(key: string) {
  if (!isAnswersSortKey(key)) {
    return
  }

  sort.toggleSort(key)
  pagination.resetPage()
}

async function handleDelete(answerId: string, groupName: string) {
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffFormAnswerConfirmMessage(groupName))) {
    return
  }
  await deleteAnswerMutation.mutateAsync(String(answerId))
}
</script>

<template>
  <PageLayout fullWidth>
    <TabStrip :tabs="staffFormTabs" />

    <div v-if="answersQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="answersQuery.data.value" class="space-y-6">
      <SurfaceCard tag="header">
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
                v-if="showNotAnsweredLink"
                :to="`/staff/forms/${formId}/not_answered`"
                class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              >
                未提出企画を表示
              </RouterLink>
            </div>
          </template>
        </SurfaceHeader>
        <div class="border-t border-border px-6 py-5 text-sm text-body">
          <div class="grid gap-2">
            <p>
              公開設定 :
              {{ answersQuery.data.value.form.isPublic ? '公開' : '非公開' }}
              <span v-if="answersQuery.data.value.form.answerableTags.length > 0">
                （{{ answersQuery.data.value.form.answerableTags.join(' / ') }} のタグを持つ企画に限定公開）
              </span>
            </p>
            <p>
              受付状態 :
              {{ answersQuery.data.value.form.isOpen ? '受付中' : '受付期間外' }}
            </p>
            <p class="whitespace-pre-wrap leading-7 text-muted">
              {{ answersQuery.data.value.form.description }}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <StaffDataGrid
          :rows="rows"
          :columns="columns"
          :page="pagination.page.value"
          :page-size="pagination.pageSize.value"
          :total="sortedAnswers.length"
          :loading="answersQuery.isFetching.value"
          :sort-key="sort.sortKey.value"
          :sort-direction="sort.sortDirection.value"
          table-label="回答一覧"
          empty-message="まだ回答はありません。"
          @first="pagination.setFirstPage"
          @prev="pagination.setPrevPage"
          @next="pagination.setNextPage"
          @last="pagination.setLastPage"
          @reload="answersQuery.refetch()"
          @sort="handleSort"
          @update:page-size="pagination.setPageSize"
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
              <span class="ml-1 text-muted-2"> — {{ (value as unknown as { groupName: string }).groupName }} </span>
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
