import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SurfaceCardBand from './SurfaceCardBand.vue'
import SurfaceCard from './SurfaceCard.vue'

const meta = {
  title: 'UI/Surfaces/SurfaceCardBand',
  component: SurfaceCardBand,
  tags: ['autodocs'],
  argTypes: {
    borderless: { control: 'boolean' },
    ignoreMainPadding: { control: 'boolean' }
  }
} satisfies Meta<typeof SurfaceCardBand>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { SurfaceCardBand, SurfaceCard },
    template: `
      <SurfaceCard>
        <SurfaceCardBand>
          <p class="text-body font-semibold">セクションタイトル</p>
        </SurfaceCardBand>
        <div class="px-6 py-4">
          <p class="text-sm text-body">コンテンツ</p>
        </div>
      </SurfaceCard>
    `
  })
}

export const Borderless: Story = {
  render: () => ({
    components: { SurfaceCardBand, SurfaceCard },
    template: `
      <SurfaceCard>
        <SurfaceCardBand :borderless="true">
          <p class="text-body font-semibold">ボーダーなし</p>
        </SurfaceCardBand>
        <div class="px-6 py-4">
          <p class="text-sm text-body">コンテンツ</p>
        </div>
      </SurfaceCard>
    `
  })
}
