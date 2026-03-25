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
    return 'is-center'
  }
  if (column.align === 'right') {
    return 'is-right'
  }
  return 'is-left'
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
  <div class="grid">
    <div v-if="$slots.toolbar" class="grid-toolbar">
      <slot name="toolbar" />
    </div>

    <div class="grid-controls">
      <div class="grid-controls__group">
        <button
          class="grid-controls__button"
          type="button"
          :disabled="loading || page <= 1"
          title="最初のページ"
          @click="emit('first')"
        >
          <i class="fas fa-angle-double-left fa-fw" aria-hidden="true" />
        </button>
        <button
          class="grid-controls__button"
          type="button"
          :disabled="loading || page <= 1"
          title="前のページ"
          @click="emit('prev')"
        >
          <i class="fas fa-chevron-left fa-fw" aria-hidden="true" />
        </button>
        <button
          class="grid-controls__button"
          type="button"
          :disabled="loading || page >= totalPages"
          title="次のページ"
          @click="emit('next')"
        >
          <i class="fas fa-chevron-right fa-fw" aria-hidden="true" />
        </button>
        <button
          class="grid-controls__button"
          type="button"
          :disabled="loading || page >= totalPages"
          title="最後のページ"
          @click="emit('last')"
        >
          <i class="fas fa-angle-double-right fa-fw" aria-hidden="true" />
        </button>
        <button
          class="grid-controls__button"
          type="button"
          :disabled="loading"
          title="再読み込み"
          @click="emit('reload')"
        >
          <i class="fas fa-sync fa-fw" aria-hidden="true" />
        </button>
      </div>

      <div class="grid-controls__group is-separated">
        <label class="grid-controls__label">
          表示件数:
          <select class="grid-controls__select" :value="pageSize" :disabled="loading" @change="handlePageSizeChange">
            <option v-for="count in perPageOptions" :key="count" :value="count">
              {{ count }}
            </option>
          </select>
        </label>
      </div>

      <div class="grid-controls__summary">
        <template v-if="total > 0">
          {{ startIndex }}〜{{ endIndex }}件目 • 全{{ total }}件 (ページ{{ page }} / {{ totalPages }})
        </template>
        <template v-else>0件</template>
      </div>

      <div v-if="loading" class="grid-controls__loading text-primary">
        <i class="fas fa-spinner fa-pulse" aria-hidden="true" />
      </div>
    </div>

    <div class="grid__table_wrap">
      <table class="grid-table" :aria-label="tableLabel">
        <thead class="grid-table__thead">
          <tr class="grid-table__tr">
            <th class="grid-table__th is-activities" />
            <th
              v-for="column in columns"
              :key="column.key"
              class="grid-table__th"
              :class="[resolveAlignClass(column), column.headerClass]"
            >
              <button
                class="grid-table__th__button"
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
            <td class="grid-table__empty" :colspan="columns.length + 1">
              {{ loading ? '読み込み中...' : emptyMessage }}
            </td>
          </tr>
          <tr v-for="(row, index) in rows" :key="rowKey(row, index)" class="grid-table__tr is-in-tbody">
            <td class="grid-table__td is-activities">
              <slot name="actions" :row="row" :index="index" />
            </td>
            <td
              v-for="column in columns"
              :key="`${rowKey(row, index)}-${column.key}`"
              class="grid-table__td"
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

<style scoped>
.grid {
  background: var(--color-surface);
}

.grid-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.grid-controls {
  align-items: center;
  background: var(--color-base);
  border-bottom: 1px solid var(--color-border);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.9rem;
  gap: 0.25rem;
  padding: 0.5rem;
}

.grid-controls__group {
  align-items: center;
  display: inline-flex;
  gap: 0.125rem;
}

.grid-controls__group.is-separated {
  border-left: 1px solid var(--color-border);
  margin-left: 0.5rem;
  padding-left: 0.5rem;
}

.grid-controls__button {
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: 0.45rem;
  color: var(--color-body);
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
  min-height: 2rem;
  min-width: 2rem;
}

.grid-controls__button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.grid-controls__label {
  align-items: center;
  color: var(--color-body);
  display: inline-flex;
  font-weight: 500;
  gap: 0.4rem;
}

.grid-controls__select {
  border: 1px solid var(--color-border);
  border-radius: 0.45rem;
  font-size: 0.9rem;
  padding: 0.25rem 0.4rem;
  width: auto;
}

.grid-controls__summary {
  margin-left: auto;
  padding-left: 0.5rem;
  white-space: nowrap;
}

.grid-controls__loading {
  padding-left: 0.5rem;
}

.grid__table_wrap {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  overflow: auto;
  width: 100%;
}

.grid-table {
  border: 0;
  border-collapse: collapse;
  border-spacing: 0;
  min-width: 100%;
  width: 100%;
}

.grid-table__thead {
  border-bottom: 1px solid var(--color-border);
}

.grid-table__th {
  padding: 0;
  text-align: left;
}

.grid-table__th.is-activities {
  min-width: 6rem;
}

.grid-table__th__button {
  appearance: none;
  background: transparent;
  border: 0;
  color: var(--color-body);
  cursor: pointer;
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  text-align: left;
  white-space: nowrap;
  width: 100%;
}

.grid-table__th__button:disabled {
  cursor: default;
}

.grid-table__tr.is-in-tbody:nth-child(2n) {
  background: var(--color-grid-table-stripe);
}

.grid-table__tr.is-in-tbody:hover {
  background: var(--color-surface-light);
}

.grid-table__td {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  vertical-align: middle;
  white-space: nowrap;
}

.grid-table__td.is-activities {
  white-space: nowrap;
}

.grid-table__empty {
  color: var(--color-muted);
  font-size: 0.95rem;
  padding: 1rem;
  text-align: center;
}

.is-left {
  text-align: left;
}

.is-center {
  text-align: center;
}

.is-right {
  text-align: right;
}
</style>
