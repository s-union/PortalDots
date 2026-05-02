import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormDetailIndexPage from './index.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'Staff Mode/Application Management/Detail',
  component: StaffFormDetailIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/staff/forms/form-1' },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true }))
      ]
    }
  }
} satisfies Meta<typeof StaffFormDetailIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
