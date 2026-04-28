import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AlertMessage from './AlertMessage.vue'

const meta = {
  title: 'UI/AlertMessage',
  component: AlertMessage,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['danger', 'success', 'info', 'muted']
    }
  }
} satisfies Meta<typeof AlertMessage>

export default meta
type Story = StoryObj<typeof meta>

export const Danger: Story = {
  args: { tone: 'danger' },
  render: (args) => ({
    components: { AlertMessage },
    setup() {
      return { args }
    },
    template: `<AlertMessage v-bind="args">入力内容に誤りがあります。もう一度確認してください。</AlertMessage>`
  })
}

export const Success: Story = {
  args: { tone: 'success' },
  render: (args) => ({
    components: { AlertMessage },
    setup() {
      return { args }
    },
    template: `<AlertMessage v-bind="args">保存が完了しました。</AlertMessage>`
  })
}

export const Info: Story = {
  args: { tone: 'info' },
  render: (args) => ({
    components: { AlertMessage },
    setup() {
      return { args }
    },
    template: `<AlertMessage v-bind="args">この操作は元に戻せません。注意してください。</AlertMessage>`
  })
}

export const Muted: Story = {
  args: { tone: 'muted' },
  render: (args) => ({
    components: { AlertMessage },
    setup() {
      return { args }
    },
    template: `<AlertMessage v-bind="args">補足情報: この設定は管理者のみが変更できます。</AlertMessage>`
  })
}
