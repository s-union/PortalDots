import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffUsersIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockStaffUser2 } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Users/Index',
  component: StaffUsersIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/users', () =>
          HttpResponse.json({
            items: [mockStaffUser2],
            page: 1,
            pageSize: 20,
            total: 1
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffUsersIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
