<script setup lang="ts">
import { computed } from 'vue'
import { calculateTotalPages } from '@/lib/pagination'

export interface StaffDataGridColumn {
  key: string
  label: string
  sortable?: boolean
  headerClass?: string
  cellClass?: string
  align?: 'left' | 'center' | 'right'
}

export interface StaffDataGridRow {
  id?: string | number
  [key: string]: unknown
}

const {
  rows,
  columns,
  page,
  pageSize,
  total,
  loading = false,
  sortKey = '',
  sortDirection = 'asc',
  filterActive = false,
  showFilterButton = false,
  perPageOptions = [10, 25, 50, 100],
  emptyMessage = 'データが見つかりませんでした。',
  tableLabel = 'staff data grid'
} = defineProps<{
  rows: StaffDataGridRow[]
  columns: StaffDataGridColumn[]
  page: number
  pageSize: number
  total: number
  loading?: boolean
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  filterActive?: boolean
  showFilterButton?: boolean
  perPageOptions?: number[]
  emptyMessage?: string
  tableLabel?: string
}>()

const emit = defineEmits<{
  first: []
  prev: []
  next: []
  last: []
  reload: []
  filter: []
  sort: [key: string]
  'update:pageSize': [pageSize: number]
}>()

const totalPages = computed(() => calculateTotalPages(total, pageSize))
const startIndex = computed(() => (total === 0 ? 0 : (page - 1) * pageSize + 1))
const endIndex = computed(() => Math.min(page * pageSize, total))

function handleSort(column: StaffDataGridColumn) {
  if (!column.sortable) {
    return
  }
  emit('sort', column.key)
}

function handlePageSizeChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }

  const next = Number.parseInt(target.value, 10)
  if (Number.isNaN(next) || next <= 0) {
    return
  }
  emit('update:pageSize', next)
}

function resolveAlignClass(column: StaffDataGridColumn) {
  if (column.align === 'center') {
    return 'text-center'
  }
  if (column.align === 'right') {
    return 'text-right'
  }
  return 'text-left'
}

function resolveHeaderButtonAlignClass(column: StaffDataGridColumn) {
  if (column.align === 'center') {
    return 'justify-center text-center'
  }
  if (column.align === 'right') {
    return 'justify-end text-right'
  }
  return 'justify-start text-left'
}

function formatValue(value: unknown) {
  if (value === true) {
    return 'はい'
  }
  if (value === false || value === null || value === undefined || value === '') {
    return '-'
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ')
  }
  return String(value)
}

function rowKey(row: Record<string, unknown>, index: number) {
  const id = row.id
  if (typeof id === 'string' || typeof id === 'number') {
    return id
  }
  return index
}
</script>

<template>
  <div class="grid bg-surface">
    <div v-if="$slots.toolbar" class="grid-toolbar flex flex-wrap gap-2 px-2 py-4">
      <slot name="toolbar" />
    </div>

    <div class="grid-controls flex flex-wrap items-center gap-1 border-y border-border bg-base p-2 text-[0.9rem]">
      <div class="grid-controls__group inline-flex items-center gap-0.5">
        <button
          class="grid-controls__button inline-flex h-8 w-8 items-center justify-center rounded-[0.45rem] text-body transition hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="loading || page <= 1"
          title="最初のページ"
          @click="emit('first')"
        >
          <i class="fas fa-angle-double-left fa-fw" aria-hidden="true" />
        </button>
        <button
          class="grid-controls__button inline-flex h-8 w-8 items-center justify-center rounded-[0.45rem] text-body transition hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="loading || page <= 1"
          title="前のページ"
          @click="emit('prev')"
        >
          <i class="fas fa-chevron-left fa-fw" aria-hidden="true" />
        </button>
        <button
          class="grid-controls__button inline-flex h-8 w-8 items-center justify-center rounded-[0.45rem] text-body transition hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="loading || page >= totalPages"
          title="次のページ"
          @click="emit('next')"
        >
          <i class="fas fa-chevron-right fa-fw" aria-hidden="true" />
        </button>
        <button
          class="grid-controls__button inline-flex h-8 w-8 items-center justify-center rounded-[0.45rem] text-body transition hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="loading || page >= totalPages"
          title="最後のページ"
          @click="emit('last')"
        >
          <i class="fas fa-angle-double-right fa-fw" aria-hidden="true" />
        </button>
        <button
          class="grid-controls__button inline-flex h-8 w-8 items-center justify-center rounded-[0.45rem] text-body transition hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="loading"
          title="再読み込み"
          @click="emit('reload')"
        >
          <i class="fas fa-sync fa-fw" aria-hidden="true" />
        </button>
      </div>

      <button
        v-if="showFilterButton"
        class="grid-controls__button relative ml-2 inline-flex h-8 items-center justify-center gap-1 border-l border-border pl-2 pr-2 text-body transition hover:bg-primary-light hover:text-primary"
        type="button"
        title="絞り込み"
        @click="emit('filter')"
      >
        <i class="fas fa-filter fa-fw" aria-hidden="true" />
        絞り込み
        <i
          v-if="filterActive"
          class="fas fa-circle absolute right-1 top-1 scale-[0.5] text-primary"
          aria-hidden="true"
        />
      </button>

      <div class="grid-controls__group ml-2 inline-flex items-center border-l border-border pl-2">
        <label class="grid-controls__label inline-flex items-center gap-2 font-medium text-body">
          表示件数:
          <select
            class="grid-controls__select min-w-[4.5rem] rounded-[0.45rem] border border-border bg-surface px-2 py-1 text-[0.9rem]"
            :value="pageSize"
            :disabled="loading"
            @change="handlePageSizeChange"
          >
            <option v-for="count in perPageOptions" :key="count" :value="count">
              {{ count }}
            </option>
          </select>
        </label>
      </div>

      <div
        class="grid-controls__summary ml-2 border-l border-border pl-2 text-body max-[860px]:basis-full max-[860px]:border-l-0 max-[860px]:pl-0 min-[861px]:ml-auto"
      >
        <template v-if="total > 0">
          {{ startIndex }}〜{{ endIndex }}件目 • 全{{ total }}件 (ページ{{ page }} / {{ totalPages }})
        </template>
        <template v-else>0件</template>
      </div>

      <div v-if="loading" class="grid-controls__loading ml-2 text-primary">
        <i class="fas fa-spinner fa-pulse" aria-hidden="true" />
      </div>
    </div>

    <div class="grid__table_wrap w-full overflow-auto border-b border-border bg-surface">
      <table class="grid-table w-full min-w-full border-collapse border-spacing-0" :aria-label="tableLabel">
        <thead class="grid-table__thead border-b border-border">
          <tr class="grid-table__tr">
            <th class="grid-table__th is-activities w-24" />
            <th
              v-for="column in columns"
              :key="column.key"
              class="grid-table__th p-0"
              :class="[resolveAlignClass(column), column.headerClass]"
            >
              <button
                class="grid-table__th__button inline-flex w-full items-center gap-1 whitespace-nowrap px-4 py-6 text-[0.9rem] font-semibold text-body disabled:cursor-default"
                :class="resolveHeaderButtonAlignClass(column)"
                type="button"
                :disabled="!column.sortable"
                @click="handleSort(column)"
              >
                {{ column.label }}
                <template v-if="column.sortable && sortKey === column.key">
                  <i v-if="sortDirection === 'asc'" class="fas fa-fw fa-sort-up text-primary" aria-hidden="true" />
                  <i v-else class="fas fa-fw fa-sort-down text-primary" aria-hidden="true" />
                </template>
                <i v-else-if="column.sortable" class="fas fa-fw fa-sort text-muted" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="grid-table__tbody">
          <tr v-if="rows.length === 0" class="grid-table__tr is-empty">
            <td class="grid-table__empty px-4 py-4 text-center text-[0.95rem] text-muted" :colspan="columns.length + 1">
              {{ loading ? '読み込み中...' : emptyMessage }}
            </td>
          </tr>
          <tr
            v-for="(row, index) in rows"
            :key="rowKey(row, index)"
            class="grid-table__tr is-in-tbody even:bg-grid-table-stripe hover:bg-surface-light"
          >
            <td class="grid-table__td is-activities whitespace-nowrap px-4 py-2 align-middle text-[0.9rem]">
              <slot name="actions" :row="row" :index="index" />
            </td>
            <td
              v-for="column in columns"
              :key="`${rowKey(row, index)}-${column.key}`"
              class="grid-table__td whitespace-nowrap px-4 py-2 align-middle text-[0.9rem]"
              :class="[resolveAlignClass(column), column.cellClass]"
            >
              <slot :name="`cell-${column.key}`" :row="row" :column="column" :value="row[column.key]">
                <slot name="cell" :row="row" :column="column" :value="row[column.key]">
                  {{ formatValue(row[column.key]) }}
                </slot>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
