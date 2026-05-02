import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffCircleDetailPage from './index.vue'
import {
  mockSessionBootstrapStaff,
  mockStaffCircle,
  mockParticipationType,
  mockPlace,
  mockStaffUser2
} from '@/mocks/data'

const meta = {
  title: 'Staff Mode/Circle Management/Details',
  component: StaffCircleDetailPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/circles/circle-1'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/circles/:circleId', () => HttpResponse.json(mockStaffCircle)),
        http.get('/v1/staff/participation-types', () => HttpResponse.json([mockParticipationType])),
        http.get('/v1/staff/places', () => HttpResponse.json([mockPlace])),
        http.get('/v1/staff/circles/:circleId/members', () =>
          HttpResponse.json([
            {
              userId: mockStaffUser2.id,
              displayName: mockStaffUser2.displayName,
              loginIds: mockStaffUser2.loginIds,
              isLeader: false
            }
          ])
        ),
        http.put('/v1/staff/circles/:circleId', () => HttpResponse.json(mockStaffCircle)),
        http.delete('/v1/staff/circles/:circleId', () => new HttpResponse(null, { status: 204 })),
        http.post('/v1/staff/circles/:circleId/members', () => new HttpResponse(null, { status: 204 })),
        http.delete('/v1/staff/circles/:circleId/members/:userId', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffCircleDetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const EmptyMembers: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/circles/:circleId', () => HttpResponse.json(mockStaffCircle)),
        http.get('/v1/staff/participation-types', () => HttpResponse.json([mockParticipationType])),
        http.get('/v1/staff/places', () => HttpResponse.json([mockPlace])),
        http.get('/v1/staff/circles/:circleId/members', () => HttpResponse.json([])),
        http.put('/v1/staff/circles/:circleId', () => HttpResponse.json(mockStaffCircle)),
        http.delete('/v1/staff/circles/:circleId', () => new HttpResponse(null, { status: 204 })),
        http.post('/v1/staff/circles/:circleId/members', () => new HttpResponse(null, { status: 204 })),
        http.delete('/v1/staff/circles/:circleId/members/:userId', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
}
