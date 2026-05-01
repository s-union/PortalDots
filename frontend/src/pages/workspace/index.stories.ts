import type { Meta, StoryObj } from '@storybook/vue3-vite'
import WorkspaceIndexPage from './index.vue'

// Workspace/index is just a redirect component
const meta = {
  title: '一般モード/ホーム',
  component: WorkspaceIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta<typeof WorkspaceIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
