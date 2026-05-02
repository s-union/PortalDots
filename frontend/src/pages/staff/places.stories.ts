import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffPlacesPage from './places.vue'
import { mockSessionBootstrapStaff, mockPlace } from '@/mocks/data'

const meta = {
  title: 'Staff Mode/Place Management',
  component: StaffPlacesPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/places', () =>
          HttpResponse.json({
            items: [mockPlace, { ...mockPlace, id: 'place-2', name: 'サブステージ', type: 2 }],
            page: 1,
            pageSize: 20,
            total: 2
          })
        ),
        http.post('/v1/staff/places', () => HttpResponse.json(mockPlace)),
        http.put('/v1/staff/places/:placeId', () => HttpResponse.json(mockPlace)),
        http.delete('/v1/staff/places/:placeId', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffPlacesPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
