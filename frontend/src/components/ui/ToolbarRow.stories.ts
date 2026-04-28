import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ToolbarRow from './ToolbarRow.vue'

const meta = {
  title: 'UI/ToolbarRow',
  component: ToolbarRow,
  tags: ['autodocs']
} satisfies Meta<typeof ToolbarRow>

export default meta
type Story = StoryObj<typeof meta>

export const WithButtons: Story = {
  render: () => ({
    components: { ToolbarRow },
    template: `
      <ToolbarRow>
        <button class="rounded border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white">
          新規作成
        </button>
        <button class="rounded border border-border bg-surface px-4 py-2 text-sm text-body">
          エクスポート
        </button>
      </ToolbarRow>
    `
  })
}

export const WithSearch: Story = {
  render: () => ({
    components: { ToolbarRow },
    template: `
      <ToolbarRow>
        <input type="text" placeholder="キーワード検索..." class="rounded border border-border px-3 py-2 text-sm" />
        <button class="rounded border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white">
          検索
        </button>
        <button class="ml-auto rounded border border-border bg-surface px-4 py-2 text-sm text-body">
          フィルター
        </button>
      </ToolbarRow>
    `
  })
}
