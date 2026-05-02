import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffUsersIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockStaffUser2 } from '@/mocks/data'

const meta = {
  title: 'Staff Mode/User Management',
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

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/users', () =>
          HttpResponse.json({
            items: [],
            page: 1,
            pageSize: 20,
            total: 0
          })
        )
      ]
    }
  }
}

export const UnverifiedUsers: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/users', () =>
          HttpResponse.json({
            items: [
              {
                ...mockStaffUser2,
                id: 'staff-user-unverified',
                displayName: '未確認 ユーザー',
                lastName: '未確認',
                firstName: 'ユーザー',
                isVerified: false,
                isEmailVerified: false
              },
              {
                ...mockStaffUser2,
                id: 'staff-user-admin',
                roles: ['admin'],
                displayName: '管理者 花子',
                lastName: '管理者',
                firstName: '花子'
              }
            ],
            page: 1,
            pageSize: 20,
            total: 2
          })
        )
      ]
    }
  }
}
