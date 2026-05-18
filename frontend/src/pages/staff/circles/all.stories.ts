import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffCirclesAllPage from './all.vue'
import { mockSessionBootstrapStaff, mockStaffCircle } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Circles/All Records',
  component: StaffCirclesAllPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/circles/all', () =>
          HttpResponse.json([
            mockStaffCircle,
            { ...mockStaffCircle, id: 'circle-2', name: 'サークルB', status: 'approved' }
          ])
        ),
        http.get('/v1/staff/tags', () =>
          HttpResponse.json({
            items: [
              { id: 'tag-1', name: '文化系', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }
            ],
            page: 1,
            pageSize: 100,
            total: 1
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffCirclesAllPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
