import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffParticipationTypeCirclesPage from './index.vue'
import { mockSessionBootstrapStaff, mockParticipationType, mockStaffCircle } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Participation Types/Circle List',
  component: StaffParticipationTypeCirclesPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/circles/participation_types/type-1'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/participation-types/{typeID}', () => HttpResponse.json(mockParticipationType)),
        http.get('/v1/staff/participation-types/{typeID}/circles', ({ request }) => {
          const url = new URL(request.url)
          return HttpResponse.json({
            items: [mockStaffCircle],
            page: Number(url.searchParams.get('page') ?? 1),
            pageSize: Number(url.searchParams.get('pageSize') ?? 25),
            total: 1
          })
        }),
        http.delete('/v1/staff/circles/{circleID}', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffParticipationTypeCirclesPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/participation-types/{typeID}', () => HttpResponse.json(mockParticipationType)),
        http.get('/v1/staff/participation-types/{typeID}/circles', ({ request }) => {
          const url = new URL(request.url)
          return HttpResponse.json({
            items: [],
            page: Number(url.searchParams.get('page') ?? 1),
            pageSize: Number(url.searchParams.get('pageSize') ?? 25),
            total: 0
          })
        }),
        http.delete('/v1/staff/circles/{circleID}', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
}
