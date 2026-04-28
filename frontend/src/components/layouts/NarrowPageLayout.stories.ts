import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NarrowPageLayout from './NarrowPageLayout.vue'

const meta = {
  title: 'UI/Layout/NarrowPageLayout',
  component: NarrowPageLayout,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' }
} satisfies Meta<typeof NarrowPageLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { NarrowPageLayout },
    template: `
      <NarrowPageLayout>
        <div class="rounded border border-border bg-surface p-6 shadow-lv1">
          <h2 class="text-lg font-semibold text-body">ナローレイアウト</h2>
          <p class="mt-2 text-sm text-muted">max-w-[880px] の幅制限があるコンテナです。</p>
        </div>
      </NarrowPageLayout>
    `
  })
}
