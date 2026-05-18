import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffSettingsPage from './settings.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Settings',
  component: StaffSettingsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff))]
    }
  }
} satisfies Meta<typeof StaffSettingsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
