<script setup lang="ts">
definePage({
  path: '/staff/forms/:formId/answers',
  meta: staffPageMeta('formAnswers.read')
})

import { staffPageMeta } from '@/lib/pageMeta'

import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StaffFilterDrawer, { type StaffFilterField } from '@/components/staff/StaffFilterDrawer.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import ToolbarRow from '@/components/ui/ToolbarRow.vue'
import { buttonVariants } from '@/lib/ui/variants'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildDeleteStaffFormAnswerConfirmMessage,
  buildStaffFormAnswersExportUrl,
  buildStaffFormAnswerUploadsZipUrl,
  useDeleteStaffFormAnswerMutation,
  useStaffFormAnswersIndexQuery
} from '@/features/staff/forms/answers'
import { buildStaffFormTabs } from '@/lib/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffDataGridFilters } from '@/lib/useStaffDataGridFilters'
import LoadingState from '@/components/ui/LoadingState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FaIcon from '@/components/ui/FaIcon.vue'

const route = useRoute('/staff/forms/[formId]/answers/')
const sessionStore = useSessionStore()
const router = useRouter()
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

const answersSortKeys = ['id', 'circle', 'createdAt', 'updatedAt'] as const
type AnswersSortKey = (typeof answersSortKeys)[number]

const filterFields: StaffFilterField[] = [
  { key: 'circle', label: '企画名', type: 'string' },
  { key: 'createdAt', label: '作成日時', type: 'string' },
  { key: 'updatedAt', label: '更新日時', type: 'string' }
]

function isFilterKey(key: string) {
  return filterFields.some((f) => f.key === key)
}

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

const rawAnswers = computed<Record<string, unknown>[]>(() =>
  (answersQuery.data.value?.answers ?? []).map((answer) => {
    const row: Record<string, unknown> = {
      id: answer.id,
      circle: answer.circle?.name ?? '',
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
      _groupName: answer.circle?.groupName ?? ''
    }
    for (const question of answersQuery.data.value?.form.questions ?? []) {
      if (question.type === 'heading') continue
      const values = answer.details[question.id] ?? []
      row[`question_${question.id}`] = values.join(', ')
    }
    return row
  })
)

function resolveSortValue(row: Record<string, unknown>, key: AnswersSortKey) {
  if (key === 'circle') return String(row[key] ?? '').toLowerCase()
  return String(row[key] ?? '').toLowerCase()
}

function matchesSearch(row: Record<string, unknown>, search: string) {
  const haystack = String(row.circle ?? '') + ' ' + String(row._groupName ?? '')
  return haystack.toLowerCase().includes(search)
}

function matchesFilterQuery(row: Record<string, unknown>, query: { keyName: string; operator: string; value: string }) {
  const left = String(row[query.keyName] ?? '').toLowerCase()
  const right = query.value.trim().toLowerCase()

  if (query.operator === '=') return left === right
  if (query.operator === '!=') return left !== right
  if (query.operator === 'not like') return right === '' ? true : !left.includes(right)
  return right === '' ? true : left.includes(right)
}

const {
  pagedRows,
  sortedRows,
  filterActive,
  sort,
  pagination,
  searchQuery,
  isFilterOpen,
  draftFilterMode,
  draftFilterQueries,
  handleSort,
  handleSearch,
  openFilter,
  closeFilter,
  handleAddFilter,
  handleRemoveFilter,
  handleUpdateFilter,
  handleFilterModeUpdate,
  handleApplyFilters,
  handleClearFilters
} = useStaffDataGridFilters<Record<string, unknown>, AnswersSortKey>({
  rows: rawAnswers,
  sortKeys: answersSortKeys,
  defaultSortKey: 'id',
  filterFields,
  resolveSortValue,
  matchesSearch,
  matchesFilterQuery,
  isFilterKey
})

function navigateToEdit(answerId: string) {
  router.push(`/staff/forms/${formId.value}/answers/${answerId}/edit`)
}

async function handleDelete(answerId: string, groupName: string) {
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffFormAnswerConfirmMessage(groupName))) {
    return
  }
  await deleteAnswerMutation.mutateAsync(String(answerId))
}
</script>

<template>
  <StaffSideWindowContainer :is-open="isFilterOpen">
    <PageLayout fullWidth>
      <TabStrip :tabs="staffFormTabs" />

      <LoadingState v-if="answersQuery.isPending.value" />

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
                <BaseButton :to="`/staff/forms/${formId}/answers/create`" variant="primary" size="md" weight="semibold">
                  新規回答
                </BaseButton>
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
            :rows="pagedRows as StaffDataGridRow[]"
            :columns="columns"
            :page="pagination.page.value"
            :page-size="pagination.pageSize.value"
            :total="sortedRows.length"
            :loading="answersQuery.isFetching.value"
            :sort-key="sort.sortKey.value"
            :sort-direction="sort.sortDirection.value"
            :show-filter-button="true"
            :filter-active="filterActive"
            table-label="回答一覧"
            empty-message="まだ回答はありません。"
            @first="pagination.setFirstPage"
            @prev="pagination.setPrevPage"
            @next="pagination.setNextPage"
            @last="pagination.setLastPage"
            @reload="answersQuery.refetch()"
            @sort="handleSort"
            @filter="openFilter"
            @update:page-size="pagination.setPageSize"
          >
            <template #toolbar>
              <ToolbarRow>
                <form class="flex items-center gap-2" @submit.prevent="handleSearch">
                  <input
                    v-model="searchQuery"
                    type="search"
                    placeholder="企画名で絞り込み"
                    class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button :class="buttonVariants({ variant: 'secondary', size: 'md' })" type="submit">
                    <FaIcon name="search" fixed-width />
                    絞り込み
                  </button>
                </form>
                <p class="text-sm text-muted">
                  現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全回答:
                  {{ rawAnswers.length }}
                </p>
              </ToolbarRow>
            </template>

            <template #actions="{ row }">
              <div class="flex items-center gap-1">
                <IconActionButton title="編集" @click="navigateToEdit(String(row.id))">
                  <FaIcon name="pencil-alt" fixed-width />
                </IconActionButton>
                <IconActionButton
                  variant="danger"
                  title="削除"
                  :disabled="deleteAnswerMutation.isPending.value"
                  @click="handleDelete(String(row.id), String(row._groupName))"
                >
                  <FaIcon name="trash" fixed-width />
                </IconActionButton>
              </div>
            </template>

            <template #cell-circle="{ value }">
              <span v-if="value && typeof value === 'object' && 'name' in value && 'groupName' in value">
                <span class="font-semibold">{{ (value as { name: string; groupName: string }).name }}</span>
                <span class="ml-1 text-muted-2">
                  — {{ (value as { name: string; groupName: string }).groupName }}
                </span>
              </span>
            </template>
          </StaffDataGrid>
        </SurfaceCard>
      </article>

      <ErrorState v-else message="回答一覧を取得できませんでした。" />
    </PageLayout>
  </StaffSideWindowContainer>

  <StaffSideWindow :is-open="isFilterOpen" title="絞り込み" @click-close="closeFilter">
    <StaffFilterDrawer
      :fields="filterFields"
      :queries="draftFilterQueries"
      :mode="draftFilterMode"
      :loading="answersQuery.isFetching.value"
      @add="handleAddFilter"
      @remove="handleRemoveFilter"
      @update-query="handleUpdateFilter"
      @update-mode="handleFilterModeUpdate"
      @apply="handleApplyFilters"
      @clear="handleClearFilters"
    />
  </StaffSideWindow>
</template>
