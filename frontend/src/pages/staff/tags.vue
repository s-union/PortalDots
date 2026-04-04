<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'tags.read'
  }
})

import { computed, ref } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import DataCard from '@/components/layouts/DataCard.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import StaffTagEditor from '@/components/staff/StaffTagEditor.vue'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { buildApiUrl } from '@/lib/api/client'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'
import { canDeleteTags } from '@/features/staff/access/capabilities'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { buildDeleteStaffTagConfirmMessage, deleteStaffTag, useStaffTagsQuery } from '@/features/staff/masters/tags'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const tagsQuery = useStaffTagsQuery(enabled)
const exportHref = computed(() => buildApiUrl('/staff/tags/export'))
const canDelete = computed(() => canDeleteTags(sessionStore.roles, sessionStore.permissions))
const isEditorOpen = ref(false)
const selectedTagId = ref('')
const deletingTagId = ref('')

const deleteTagMutation = useMutation({
  mutationFn: async () => deleteStaffTag(deletingTagId.value, sessionStore.csrfToken),
  onSuccess: async () => {
    await tagsQuery.refetch()
  }
})

const sortKeys = ['tagNumber', 'name', 'createdAt', 'updatedAt'] as const
type StaffTagSortKey = (typeof sortKeys)[number]
const isStaffTagSortKey = createSortKeyGuard(sortKeys)
const sort = useSortState<StaffTagSortKey>('tagNumber')

const columns: StaffDataGridColumn[] = [
  { key: 'tagNumber', label: 'タグID', sortable: true, align: 'right', cellClass: 'font-medium text-body' },
  { key: 'name', label: 'タグ', sortable: true },
  { key: 'createdAt', label: '作成日時', sortable: true },
  { key: 'updatedAt', label: '更新日時', sortable: true }
]

const orderedTags = computed(() =>
  [...(tagsQuery.data.value ?? [])].sort((left, right) => compareString(left.createdAt, right.createdAt))
)

const tagOrderMap = computed(() => {
  const order = new Map<string, number>()
  orderedTags.value.forEach((tag, index) => {
    order.set(tag.id, index + 1)
  })
  return order
})

const sortedTags = computed(() => {
  const tags = orderedTags.value
  const key = sort.sortKey.value
  const direction = sort.sortDirection.value
  const order = direction === 'asc' ? 1 : -1

  return [...tags].sort((left, right) => {
    if (key === 'tagNumber') {
      return ((tagOrderMap.value.get(left.id) ?? 0) - (tagOrderMap.value.get(right.id) ?? 0)) * order
    }

    return compareString(left[key], right[key]) * order
  })
})

const pagination = usePaginationState(computed(() => sortedTags.value.length))

const rows = computed<StaffDataGridRow[]>(() => {
  const start = (pagination.page.value - 1) * pagination.pageSize.value
  const end = start + pagination.pageSize.value

  return sortedTags.value.slice(start, end).map((tag) => ({
    id: tag.id,
    tagNumber: String(tagOrderMap.value.get(tag.id) ?? start + 1),
    name: tag.name,
    createdAt: formatDateTimeTable(tag.createdAt),
    updatedAt: formatDateTimeTable(tag.updatedAt)
  }))
})

const selectedTag = computed(() => orderedTags.value.find((tag) => tag.id === selectedTagId.value) ?? null)

const isBusy = computed(
  () => tagsQuery.isPending.value || tagsQuery.isFetching.value || deleteTagMutation.isPending.value
)

function openCreateEditor() {
  selectedTagId.value = ''
  isEditorOpen.value = true
}

function openEditEditor(tagId: string) {
  selectedTagId.value = tagId
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
}

function handleSaved() {
  closeEditor()
}

function handleDeleted() {
  selectedTagId.value = ''
  closeEditor()
}

async function handleDeleteTag(row: StaffDataGridRow) {
  const tagId = resolveRowId(row)
  const tag = orderedTags.value.find((value) => value.id === tagId)
  if (!tag) {
    return
  }

  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffTagConfirmMessage(tag.name))) {
    return
  }

  deletingTagId.value = tag.id
  try {
    await deleteTagMutation.mutateAsync()
    if (selectedTagId.value === tag.id) {
      selectedTagId.value = ''
      closeEditor()
    }
  } finally {
    deletingTagId.value = ''
  }
}

function handleSort(nextSortKey: string) {
  if (isStaffTagSortKey(nextSortKey)) {
    sort.toggleSort(nextSortKey)
  }
}

function resolveRowId(row: StaffDataGridRow) {
  return typeof row.id === 'string' ? row.id : ''
}

function compareString(left: string, right: string) {
  return left.localeCompare(right, 'ja')
}
</script>

<template>
  <PageLayout>
    <PageHeader title="企画タグ管理" />

    <StaffSideWindowContainer :is-open="isEditorOpen">
      <DataCard>
        <StaffDataGrid
          :rows="rows"
          :columns="columns"
          :page="pagination.page.value"
          :page-size="pagination.pageSize.value"
          :total="sortedTags.length"
          :loading="isBusy"
          :sort-key="sort.sortKey.value"
          :sort-direction="sort.sortDirection.value"
          :show-filter-button="true"
          table-label="企画タグ一覧"
          empty-message="企画タグはまだありません。"
          @first="pagination.setFirstPage"
          @prev="pagination.setPrevPage"
          @next="pagination.setNextPage"
          @last="pagination.setLastPage"
          @reload="tagsQuery.refetch()"
          @sort="handleSort"
          @update:page-size="pagination.setPageSize"
        >
          <template #toolbar>
            <button
              class="rounded bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
              type="button"
              @click="openCreateEditor"
            >
              <i class="fas fa-plus fa-fw" aria-hidden="true" />
              新規タグ
            </button>
            <a
              :href="exportHref"
              class="inline-flex items-center gap-2 px-2 text-[1.05rem] text-primary transition hover:text-primary-hover hover:no-underline"
            >
              <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
              CSVで出力(タグ別企画一覧)
            </a>
          </template>

          <template #actions="{ row }">
            <div class="flex items-center gap-1">
              <button
                class="inline-flex h-8 w-8 items-center justify-center rounded text-body transition hover:bg-primary-light hover:text-primary"
                type="button"
                title="編集"
                @click="openEditEditor(resolveRowId(row))"
              >
                <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
              </button>
              <button
                v-if="canDelete"
                class="inline-flex h-8 w-8 items-center justify-center rounded text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                title="削除"
                :disabled="deleteTagMutation.isPending.value"
                @click="handleDeleteTag(row)"
              >
                <i class="fas fa-trash fa-fw" aria-hidden="true" />
              </button>
            </div>
          </template>

          <template #cell-name="{ value }">
            <span class="font-medium text-body">{{ value }}</span>
          </template>

          <template #cell-createdAt="{ value }">
            <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
          </template>

          <template #cell-updatedAt="{ value }">
            <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
          </template>
        </StaffDataGrid>
      </DataCard>
    </StaffSideWindowContainer>

    <StaffSideWindow :is-open="isEditorOpen" @click-close="closeEditor">
      <template #title>
        {{ selectedTag ? 'タグを編集' : '新規タグ' }}
      </template>
      <StaffTagEditor :tag="selectedTag" @deleted="handleDeleted" @saved="handleSaved" />
    </StaffSideWindow>
  </PageLayout>
</template>
