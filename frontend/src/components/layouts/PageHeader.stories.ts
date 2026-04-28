import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PageHeader from './PageHeader.vue'

const meta = {
  title: 'UI/Layout/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  argTypes: {
    eyebrow: { control: 'text' },
    title: { control: 'text' },
    description: { control: 'text' }
  }
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const TitleOnly: Story = {
  args: { title: 'お知らせ一覧' }
}

export const WithDescription: Story = {
  args: {
    title: '企画情報',
    description: '参加登録された企画の詳細情報を確認・編集できます。'
  }
}

export const WithEyebrow: Story = {
  args: {
    eyebrow: 'スタッフ管理',
    title: '企画詳細',
    description: 'この企画の詳細情報を確認・編集できます。'
  }
}

export const WithActions: Story = {
  args: { title: 'タグ一覧' },
  render: (args) => ({
    components: { PageHeader },
    setup() {
      return { args }
    },
    template: `
      <PageHeader v-bind="args">
        <template #actions>
          <button class="rounded border border-border bg-surface px-4 py-2 text-sm text-body">エクスポート</button>
          <button class="rounded border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white">新規作成</button>
        </template>
      </PageHeader>
    `
  })
}
