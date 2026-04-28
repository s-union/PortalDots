import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LoadingState from './LoadingState.vue'

const meta = {
  title: 'UI/LoadingState',
  component: LoadingState,
  tags: ['autodocs'],
  argTypes: {
    message: { control: 'text' }
  }
} satisfies Meta<typeof LoadingState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { message: '読み込み中...' }
}

export const CustomMessage: Story = {
  args: { message: 'データを取得しています...' }
}
