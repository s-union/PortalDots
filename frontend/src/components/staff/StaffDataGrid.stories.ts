import type { Meta, StoryObj } from '@storybook/vue3-vite'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from './StaffDataGrid.vue'

const meta = {
  title: 'UI/Staff/StaffDataGrid',
  component: StaffDataGrid,
  tags: ['autodocs'],
  argTypes: {
    loading: { control: 'boolean' },
    page: { control: 'number' },
    pageSize: { control: 'number' },
    total: { control: 'number' },
    filterActive: { control: 'boolean' },
    showFilterButton: { control: 'boolean' }
  }
} satisfies Meta<typeof StaffDataGrid>

export default meta
type Story = StoryObj<typeof meta>

const columns: StaffDataGridColumn[] = [
  { key: 'name', label: '企画名', sortable: true },
  { key: 'groupName', label: '団体名', sortable: true },
  { key: 'participationTypeName', label: '参加種別' },
  { key: 'status', label: 'ステータス', align: 'center' }
]

const rows: StaffDataGridRow[] = [
  {
    id: 'circle-1',
    name: 'テストサークル',
    groupName: 'テストグループ',
    participationTypeName: '一般参加',
    status: 'pending'
  },
  { id: 'circle-2', name: 'サークルB', groupName: 'グループB', participationTypeName: '一般参加', status: 'approved' },
  { id: 'circle-3', name: 'サークルC', groupName: 'グループC', participationTypeName: '特別参加', status: 'rejected' }
]

export const Default: Story = {
  args: {
    rows,
    columns,
    page: 1,
    pageSize: 20,
    total: 3,
    loading: false
  }
}

export const Loading: Story = {
  args: {
    rows: [],
    columns,
    page: 1,
    pageSize: 20,
    total: 0,
    loading: true
  }
}

export const Empty: Story = {
  args: {
    rows: [],
    columns,
    page: 1,
    pageSize: 20,
    total: 0,
    loading: false,
    emptyMessage: '企画が見つかりませんでした。'
  }
}

export const WithFilterButton: Story = {
  args: {
    rows,
    columns,
    page: 1,
    pageSize: 20,
    total: 3,
    loading: false,
    showFilterButton: true,
    filterActive: false
  }
}

export const WithActiveFilter: Story = {
  args: {
    rows: rows.slice(0, 1),
    columns,
    page: 1,
    pageSize: 20,
    total: 1,
    loading: false,
    showFilterButton: true,
    filterActive: true
  }
}

export const MultiPage: Story = {
  args: {
    rows,
    columns,
    page: 2,
    pageSize: 3,
    total: 50,
    loading: false
  }
}

export const WithSorting: Story = {
  args: {
    rows,
    columns,
    page: 1,
    pageSize: 20,
    total: 3,
    loading: false,
    sortKey: 'name',
    sortDirection: 'asc' as const
  }
}

export const WithActionsSlot: Story = {
  args: { rows, columns, page: 1, pageSize: 20, total: 3 },
  render: () => ({
    components: { StaffDataGrid },
    setup() {
      return { rows, columns }
    },
    template: `
      <StaffDataGrid
        :rows="rows"
        :columns="columns"
        :page="1"
        :page-size="20"
        :total="3"
        table-label="企画一覧"
      >
        <template #actions="{ row }">
          <button class="rounded border border-border bg-surface px-2 py-1 text-xs text-body hover:bg-surface-light">
            詳細
          </button>
        </template>
      </StaffDataGrid>
    `
  })
}
