import type { Meta, StoryObj } from '@storybook/vue3-vite'
import StaffSideWindowContainer from './StaffSideWindowContainer.vue'

const meta = {
  title: 'UI/Staff/StaffSideWindowContainer',
  component: StaffSideWindowContainer,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' }
  }
} satisfies Meta<typeof StaffSideWindowContainer>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {
  args: { isOpen: false },
  render: (args) => ({
    components: { StaffSideWindowContainer },
    setup() {
      return { args }
    },
    template: `
      <StaffSideWindowContainer v-bind="args">
        <div class="rounded border border-border bg-surface p-6">
          <p class="text-body">サイドウィンドウが閉じた状態のコンテナ</p>
        </div>
      </StaffSideWindowContainer>
    `
  })
}

export const Open: Story = {
  args: { isOpen: true },
  render: (args) => ({
    components: { StaffSideWindowContainer },
    setup() {
      return { args }
    },
    template: `
      <StaffSideWindowContainer v-bind="args">
        <div class="rounded border border-border bg-surface p-6">
          <p class="text-body">サイドウィンドウが開いた状態のコンテナ (data-side-window-open="true")</p>
        </div>
      </StaffSideWindowContainer>
    `
  })
}
