import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DocumentPage from './[documentId].vue'

const meta = {
  title: '一般モード/公開配布資料詳細',
  component: DocumentPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta<typeof DocumentPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
