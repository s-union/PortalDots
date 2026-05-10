import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffSendEmailsPage from './send_emails.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Mass Email',
  component: StaffSendEmailsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true }))
      ]
    }
  }
} satisfies Meta<typeof StaffSendEmailsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
