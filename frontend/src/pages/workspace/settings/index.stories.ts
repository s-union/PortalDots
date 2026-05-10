import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import WorkspaceSettingsPage from './index.vue'
import { mockSessionBootstrap } from '@/mocks/data'

const meta = {
  title: 'Pages/Workspace/Settings',
  component: WorkspaceSettingsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.put('/v1/session/profile', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof WorkspaceSettingsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
