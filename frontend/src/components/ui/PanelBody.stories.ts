import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PanelBody from './PanelBody.vue'
import SurfaceCard from './SurfaceCard.vue'

const meta = {
  title: 'UI/PanelBody',
  component: PanelBody,
  tags: ['autodocs'],
  argTypes: {
    tag: { control: 'text' },
    spacious: { control: 'boolean' }
  }
} satisfies Meta<typeof PanelBody>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { PanelBody, SurfaceCard },
    template: `
      <SurfaceCard>
        <PanelBody>
          <h2 class="text-lg font-semibold text-body">本文エリア</h2>
          <p class="mt-2 text-sm leading-7 text-muted">カード内の本文や空状態に使う標準余白です。</p>
        </PanelBody>
      </SurfaceCard>
    `
  })
}

export const Spacious: Story = {
  render: () => ({
    components: { PanelBody, SurfaceCard },
    template: `
      <SurfaceCard>
        <PanelBody spacious>
          <h2 class="text-lg font-semibold text-body">余白を広めにした本文エリア</h2>
          <p class="mt-2 text-sm leading-7 text-muted">フォームや説明文が続くページで、カード内が詰まって見えないようにします。</p>
        </PanelBody>
      </SurfaceCard>
    `
  })
}
