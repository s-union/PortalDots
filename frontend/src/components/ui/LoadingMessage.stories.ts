import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LoadingMessage from './LoadingMessage.vue'

const meta = {
  title: 'UI/LoadingMessage',
  component: LoadingMessage,
  tags: ['autodocs'],
  argTypes: {
    message: { control: 'text' }
  }
} satisfies Meta<typeof LoadingMessage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { message: '読み込み中...' }
}

export const CustomMessage: Story = {
  args: { message: 'データを取得しています...' }
}
