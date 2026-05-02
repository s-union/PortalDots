import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EmptyState from './EmptyState.vue'

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    icon: { control: 'text' }
  }
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'データが見つかりませんでした',
    description: '',
    icon: ''
  }
}

export const WithDescription: Story = {
  args: {
    title: 'お知らせはありません',
    description: '現在公開中のお知らせはありません。後ほど再度確認してください。'
  }
}

export const ForDocuments: Story = {
  args: {
    title: '配布資料はありません',
    description: '現在公開中の配布資料はありません。',
    icon: '📄'
  }
}
