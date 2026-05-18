import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PageContentContainer from './PageContentContainer.vue'

const meta = {
  title: 'UI/Layout/PageContentContainer',
  component: PageContentContainer,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['default', 'narrow']
    }
  }
} satisfies Meta<typeof PageContentContainer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { PageContentContainer },
    template: `
      <PageContentContainer>
        <div class="rounded border border-border bg-surface p-6 shadow-lv1">
          <p class="text-body">デフォルト幅のコンテナです（max-w-[1024px]）</p>
        </div>
      </PageContentContainer>
    `
  })
}

export const Narrow: Story = {
  render: () => ({
    components: { PageContentContainer },
    template: `
      <PageContentContainer size="narrow">
        <div class="rounded border border-border bg-surface p-6 shadow-lv1">
          <p class="text-body">ナロー幅のコンテナです（max-w-[880px]）</p>
        </div>
      </PageContentContainer>
    `
  })
}
