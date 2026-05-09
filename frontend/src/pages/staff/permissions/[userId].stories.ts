import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffPermissionsUserPage from './[userId].vue'
import { mockSessionBootstrapStaff, mockStaffUser2 } from '@/mocks/data'

const meta = {
  title: 'Staff Mode/Permission Settings/Detail',
  component: StaffPermissionsUserPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/permissions/staff-user-1'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/permissions/:userID', () =>
          HttpResponse.json({
            user: {
              ...mockStaffUser2,
              roles: ['staff'],
              permissions: [],
              isEditable: true
            },
            definedPermissions: [
              {
                name: 'circles.read',
                group: '企画',
                displayName: '企画情報の閲覧',
                shortName: '閲覧',
                description: '企画情報を閲覧できます。'
              },
              {
                name: 'circles.edit',
                group: '企画',
                displayName: '企画情報の編集',
                shortName: '編集',
                description: '企画情報を編集できます。'
              },
              {
                name: 'users.read',
                group: 'ユーザー',
                displayName: 'ユーザー情報の閲覧',
                shortName: '閲覧',
                description: 'ユーザー情報を閲覧できます。'
              }
            ],
            assignedPermissionNames: ['circles.read']
          })
        ),
        http.put('/v1/staff/permissions/:userID', () =>
          HttpResponse.json({
            user: {
              ...mockStaffUser2,
              roles: ['staff'],
              permissions: [],
              isEditable: true
            },
            definedPermissions: [
              {
                name: 'circles.read',
                group: '企画',
                displayName: '企画情報の閲覧',
                shortName: '閲覧',
                description: '企画情報を閲覧できます。'
              },
              {
                name: 'circles.edit',
                group: '企画',
                displayName: '企画情報の編集',
                shortName: '編集',
                description: '企画情報を編集できます。'
              },
              {
                name: 'users.read',
                group: 'ユーザー',
                displayName: 'ユーザー情報の閲覧',
                shortName: '閲覧',
                description: 'ユーザー情報を閲覧できます。'
              }
            ],
            assignedPermissionNames: ['circles.read']
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffPermissionsUserPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
