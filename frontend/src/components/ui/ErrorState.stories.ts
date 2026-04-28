import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ErrorState from './ErrorState.vue'

const meta = {
  title: 'UI/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  argTypes: {
    message: { control: 'text' },
    compact: { control: 'boolean' }
  }
} satisfies Meta<typeof ErrorState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    message: 'データの読み込みに失敗しました。',
    compact: false
  }
}

export const Compact: Story = {
  args: {
    message: 'エラーが発生しました。',
    compact: true
  }
}

export const LongMessage: Story = {
  args: {
    message: 'サーバーに接続できませんでした。ネットワーク接続を確認し、しばらくしてから再度お試しください。',
    compact: false
  }
}
