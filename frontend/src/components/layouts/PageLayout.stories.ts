import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PageLayout from './PageLayout.vue'

const meta = {
  title: 'UI/Layout/PageLayout',
  component: PageLayout,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' }
} satisfies Meta<typeof PageLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { PageLayout },
    template: `
      <PageLayout>
        <div class="rounded border border-border bg-surface p-6 shadow-lv1">
          <h2 class="text-lg font-semibold text-body">ページレイアウト</h2>
          <p class="mt-2 text-sm text-muted">max-w-[1024px] の幅制限があるコンテナです。</p>
        </div>
        <div class="rounded border border-border bg-surface p-6 shadow-lv1">
          <p class="text-sm text-body">2番目のセクション</p>
        </div>
      </PageLayout>
    `
  })
}
