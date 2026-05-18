import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SurfaceCard from './SurfaceCard.vue'

const meta = {
  title: 'UI/Surfaces/SurfaceCard',
  component: SurfaceCard,
  tags: ['autodocs'],
  argTypes: {
    tag: { control: 'text' },
    overflowHidden: { control: 'boolean' },
    shadow: {
      control: 'select',
      options: ['none', 'lv1', 'lv2', 'lv3', 'lv4']
    }
  }
} satisfies Meta<typeof SurfaceCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { tag: 'section', overflowHidden: false, shadow: 'lv1' },
  render: (args) => ({
    components: { SurfaceCard },
    setup() {
      return { args }
    },
    template: `
      <SurfaceCard v-bind="args">
        <div class="px-6 py-6">
          <p class="text-body">カードのコンテンツ</p>
        </div>
      </SurfaceCard>
    `
  })
}

export const OverflowHidden: Story = {
  args: { overflowHidden: true, shadow: 'lv1' },
  render: (args) => ({
    components: { SurfaceCard },
    setup() {
      return { args }
    },
    template: `
      <SurfaceCard v-bind="args">
        <div class="px-6 py-6">
          <p class="text-body">オーバーフローが隠れるカード</p>
        </div>
      </SurfaceCard>
    `
  })
}

export const HighShadow: Story = {
  args: { shadow: 'lv4' },
  render: (args) => ({
    components: { SurfaceCard },
    setup() {
      return { args }
    },
    template: `
      <SurfaceCard v-bind="args">
        <div class="px-6 py-6">
          <p class="text-body">影が強いカード</p>
        </div>
      </SurfaceCard>
    `
  })
}

export const AsArticle: Story = {
  args: { tag: 'article' },
  render: (args) => ({
    components: { SurfaceCard },
    setup() {
      return { args }
    },
    template: `
      <SurfaceCard v-bind="args">
        <div class="px-6 py-6">
          <h2 class="text-lg font-semibold text-body">記事タイトル</h2>
          <p class="mt-2 text-sm text-muted">記事の内容がここに入ります。</p>
        </div>
      </SurfaceCard>
    `
  })
}
