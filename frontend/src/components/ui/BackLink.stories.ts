import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BackLink from './BackLink.vue'

const meta = {
  title: 'UI/BackLink',
  component: BackLink,
  tags: ['autodocs'],
  argTypes: {
    to: { control: 'text' }
  }
} satisfies Meta<typeof BackLink>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { to: '/' },
  render: (args) => ({
    components: { BackLink },
    setup() {
      return { args }
    },
    template: `<BackLink v-bind="args">トップページに戻る</BackLink>`
  })
}

export const ToParentPage: Story = {
  args: { to: '/staff/circles' },
  render: (args) => ({
    components: { BackLink },
    setup() {
      return { args }
    },
    template: `<BackLink v-bind="args">企画一覧に戻る</BackLink>`
  })
}
