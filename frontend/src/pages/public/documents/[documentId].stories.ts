import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DocumentPage from './[documentId].vue'

const meta = {
  title: 'Pages/Public/Documents/Detail',
  component: DocumentPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/public/documents/doc-1' }
  }
} satisfies Meta<typeof DocumentPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
