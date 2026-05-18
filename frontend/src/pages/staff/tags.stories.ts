import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffTagsPage from './tags.vue'
import { mockSessionBootstrapStaff, mockTag } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Tags',
  component: StaffTagsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/tags', () => HttpResponse.json([mockTag, { ...mockTag, id: 'tag-2', name: 'スポーツ系' }])),
        http.post('/v1/staff/tags', () =>
          HttpResponse.json({
            id: 'tag-new',
            name: '新タグ',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
          })
        ),
        http.put('/v1/staff/tags/{tagID}', () => HttpResponse.json(mockTag)),
        http.delete('/v1/staff/tags/{tagID}', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffTagsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/tags', () => HttpResponse.json([])),
        http.post('/v1/staff/tags', () =>
          HttpResponse.json({
            id: 'tag-new',
            name: '新タグ',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
          })
        )
      ]
    }
  }
}
