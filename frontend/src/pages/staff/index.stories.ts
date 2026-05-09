import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Staff Mode/Home',
  component: StaffIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    session: {
      bootstrap: mockSessionBootstrapStaff
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true }))
      ]
    }
  }
} satisfies Meta<typeof StaffIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LimitedPermissions: Story = {
  parameters: {
    session: {
      bootstrap: {
        ...mockSessionBootstrapStaff,
        permissions: ['circles.read', 'staff.read']
      }
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrapStaff,
            permissions: ['circles.read', 'staff.read']
          })
        ),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true }))
      ]
    }
  }
}
