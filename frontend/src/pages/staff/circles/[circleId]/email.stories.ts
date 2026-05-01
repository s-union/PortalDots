import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffCircleEmailPage from './email.vue'
import { mockSessionBootstrapStaff, mockStaffCircle } from '@/mocks/data'

const meta = {
  title: 'スタッフモード/企画管理/メール送信',
  component: StaffCircleEmailPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/circles/circle-1/email'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/circles/:circleId/email', () =>
          HttpResponse.json({
            circle: mockStaffCircle,
            recipients: [
              { id: 'user-1', displayName: '山田 太郎', loginIds: ['yamada@example.com'] },
              { id: 'user-2', displayName: '鈴木 二郎', loginIds: ['suzuki@example.com'] }
            ]
          })
        ),
        http.post('/v1/staff/circles/:circleId/email', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffCircleEmailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoRecipients: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/circles/:circleId/email', () =>
          HttpResponse.json({
            circle: mockStaffCircle,
            recipients: []
          })
        ),
        http.post('/v1/staff/circles/:circleId/email', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
}
