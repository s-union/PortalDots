import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffUserDetailPage from './[userId].vue'
import { mockSessionBootstrapStaff, mockStaffUser2 } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Users/Detail',
  component: StaffUserDetailPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/users/staff-user-1'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/users/{userID}', () =>
          HttpResponse.json({
            ...mockStaffUser2,
            roles: ['staff']
          })
        ),
        http.put('/v1/staff/users/{userID}', () =>
          HttpResponse.json({
            ...mockStaffUser2,
            roles: ['staff']
          })
        ),
        http.put('/v1/staff/users/{userID}/roles', () =>
          HttpResponse.json({
            ...mockStaffUser2,
            roles: ['staff']
          })
        ),
        http.patch('/v1/staff/users/{userID}/verify', () =>
          HttpResponse.json({
            ...mockStaffUser2,
            roles: ['staff'],
            isVerified: true
          })
        ),
        http.delete('/v1/staff/users/{userID}', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffUserDetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
