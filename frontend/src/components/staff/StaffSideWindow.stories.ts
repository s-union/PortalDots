import type { Meta, StoryObj } from '@storybook/vue3-vite'
import StaffSideWindow from './StaffSideWindow.vue'

const meta = {
  title: 'UI/Staff/Shell/StaffSideWindow',
  component: StaffSideWindow,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    isOpen: { control: 'boolean' },
    title: { control: 'text' },
    popUpUrl: { control: 'text' }
  }
} satisfies Meta<typeof StaffSideWindow>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: {
    isOpen: true,
    title: '企画詳細'
  },
  render: (args) => ({
    components: { StaffSideWindow },
    setup() {
      return { args }
    },
    template: `
      <div style="height: 100vh; background: #f5f5f5;">
        <StaffSideWindow v-bind="args">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-body">テストサークル</h3>
            <p class="mt-2 text-sm text-muted">企画の詳細情報がここに表示されます。</p>
          </div>
        </StaffSideWindow>
      </div>
    `
  })
}

export const Closed: Story = {
  args: {
    isOpen: false,
    title: '企画詳細'
  },
  render: (args) => ({
    components: { StaffSideWindow },
    setup() {
      return { args }
    },
    template: `
      <div style="height: 100vh; background: #f5f5f5;">
        <p class="p-6 text-body">サイドウィンドウは閉じています</p>
        <StaffSideWindow v-bind="args">
          <div class="p-6">
            <p class="text-sm text-muted">コンテンツ</p>
          </div>
        </StaffSideWindow>
      </div>
    `
  })
}

export const WithPopUpUrl: Story = {
  args: {
    isOpen: true,
    title: '企画詳細',
    popUpUrl: '/staff/circles/circle-1'
  },
  render: (args) => ({
    components: { StaffSideWindow },
    setup() {
      return { args }
    },
    template: `
      <div style="height: 100vh; background: #f5f5f5;">
        <StaffSideWindow v-bind="args">
          <div class="p-6">
            <p class="text-sm text-body">新しいタブで開くボタンが表示されます。</p>
          </div>
        </StaffSideWindow>
      </div>
    `
  })
}

export const WithCustomTitle: Story = {
  args: {
    isOpen: true
  },
  render: (args) => ({
    components: { StaffSideWindow },
    setup() {
      return { args }
    },
    template: `
      <div style="height: 100vh; background: #f5f5f5;">
        <StaffSideWindow v-bind="args">
          <template #title>
            <span class="text-primary">カスタムタイトル</span>
          </template>
          <div class="p-6">
            <p class="text-sm text-muted">カスタムタイトルスロットの使用例</p>
          </div>
        </StaffSideWindow>
      </div>
    `
  })
}
