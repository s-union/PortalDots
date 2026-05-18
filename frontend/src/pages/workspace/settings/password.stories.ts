import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import PasswordPage from './password.vue'
import { mockSessionBootstrap } from '@/mocks/data'

const meta = {
  title: 'Pages/Workspace/Settings/Change Password',
  component: PasswordPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.put('/v1/session/password', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof PasswordPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
