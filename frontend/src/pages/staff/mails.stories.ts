import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffMailsPage from './mails.vue'
import { mockSessionBootstrapStaff, mockMail } from '@/mocks/data'

const meta = {
  title: 'Staff Mode/Mail List',
  component: StaffMailsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/mails', () => HttpResponse.json([mockMail])),
        http.delete('/v1/staff/mails', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffMailsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/mails', () => HttpResponse.json([])),
        http.delete('/v1/staff/mails', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
}
