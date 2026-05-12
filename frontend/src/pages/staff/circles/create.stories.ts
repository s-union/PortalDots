import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffCircleCreatePage from './create.vue'
import { mockParticipationType, mockPlace, mockSessionBootstrapStaff, mockStaffCircle } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Circles/Create New',
  component: StaffCircleCreatePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/staff/circles/create' },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/participation-types', () => HttpResponse.json([mockParticipationType])),
        http.get('/v1/staff/places', () => HttpResponse.json([mockPlace])),
        http.post('/v1/staff/circles', () => HttpResponse.json(mockStaffCircle, { status: 201 }))
      ]
    }
  }
} satisfies Meta<typeof StaffCircleCreatePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
