import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DataCard from './DataCard.vue'
import ListItemLink from '@/components/ui/ListItemLink.vue'

const meta = {
  title: 'UI/Surfaces/DataCard',
  component: DataCard,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    overflowHidden: { control: 'boolean' }
  }
} satisfies Meta<typeof DataCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { title: 'お知らせ一覧' },
  render: (args) => ({
    components: { DataCard, ListItemLink },
    setup() {
      return { args }
    },
    template: `
      <DataCard v-bind="args">
        <ListItemLink to="/workspace/pages/1">
          <template #title>テストお知らせ</template>
          <template #meta>2026年1月15日</template>
        </ListItemLink>
      </DataCard>
    `
  })
}

export const WithDescription: Story = {
  args: { title: '配布資料', description: '公開中の配布資料一覧です。' },
  render: (args) => ({
    components: { DataCard, ListItemLink },
    setup() {
      return { args }
    },
    template: `
      <DataCard v-bind="args">
        <ListItemLink href="#">
          <template #title>テスト資料.pdf</template>
        </ListItemLink>
      </DataCard>
    `
  })
}

export const WithActions: Story = {
  args: { title: '企画一覧' },
  render: (args) => ({
    components: { DataCard, ListItemLink },
    setup() {
      return { args }
    },
    template: `
      <DataCard v-bind="args">
        <template #actions>
          <button class="rounded border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white">
            新規作成
          </button>
        </template>
        <ListItemLink to="/staff/circles/1">
          <template #title>テストサークル</template>
        </ListItemLink>
      </DataCard>
    `
  })
}

export const WithToolbar: Story = {
  args: { title: 'ユーザー一覧' },
  render: (args) => ({
    components: { DataCard },
    setup() {
      return { args }
    },
    template: `
      <DataCard v-bind="args">
        <template #toolbar>
          <input type="text" placeholder="キーワード検索..." class="rounded border border-border px-3 py-2 text-sm" />
        </template>
        <div class="px-6 py-4 text-sm text-muted">ユーザーデータが表示されます</div>
      </DataCard>
    `
  })
}
