import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffTagsPage from './tags.vue'
import { mockSessionBootstrapStaff, mockTag } from '@/mocks/data'

const meta = {
  title: 'スタッフモード/タグ管理',
  component: StaffTagsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/tags', () =>
          HttpResponse.json({
            items: [mockTag, { ...mockTag, id: 'tag-2', name: 'スポーツ系' }],
            page: 1,
            pageSize: 20,
            total: 2
          })
        ),
        http.post('/v1/staff/tags', () =>
          HttpResponse.json({
            id: 'tag-new',
            name: '新タグ',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
          })
        ),
        http.put('/v1/staff/tags/:tagId', () => HttpResponse.json(mockTag)),
        http.delete('/v1/staff/tags/:tagId', () => new HttpResponse(null, { status: 204 }))
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
        http.get('/v1/staff/tags', () => HttpResponse.json({ items: [], page: 1, pageSize: 20, total: 0 })),
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
