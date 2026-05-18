import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffPageDetailPage from './[pageId].vue'
import { mockSessionBootstrapStaff, mockDocument } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Notices/Edit',
  component: StaffPageDetailPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/pages/page-1'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/pages/{pageID}', () =>
          HttpResponse.json({
            id: 'page-1',
            title: 'テストお知らせ',
            body: '# テストお知らせ\n\nこれはテスト用のお知らせ本文です。',
            notes: 'スタッフ用メモ',
            createdAt: '2026-01-10T09:00:00Z',
            updatedAt: '2026-01-15T12:00:00Z',
            isPinned: false,
            isPublic: true,
            viewableTags: [],
            documentIds: [],
            documents: []
          })
        ),
        http.get('/v1/staff/tags', () =>
          HttpResponse.json([
            { id: 'tag-1', name: '文化系', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }
          ])
        ),
        http.get('/v1/staff/documents', () =>
          HttpResponse.json([
            {
              circle: { id: 'circle-1', name: 'テストサークル' },
              ...mockDocument,
              notes: '',
              filename: 'test.pdf',
              mimeType: 'application/pdf',
              isPublic: true,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-15T12:00:00Z'
            }
          ])
        ),
        http.put('/v1/staff/pages/{pageID}', () =>
          HttpResponse.json({
            id: 'page-1',
            title: 'テストお知らせ',
            body: '# テストお知らせ\n\nこれはテスト用のお知らせ本文です。',
            notes: 'スタッフ用メモ',
            createdAt: '2026-01-10T09:00:00Z',
            updatedAt: '2026-01-15T12:00:00Z',
            isPinned: false,
            isPublic: true,
            viewableTags: [],
            documentIds: [],
            documents: []
          })
        ),
        http.patch('/v1/staff/pages/{pageID}/pin', () =>
          HttpResponse.json({
            id: 'page-1',
            title: 'テストお知らせ',
            body: '# テストお知らせ\n\nこれはテスト用のお知らせ本文です。',
            notes: 'スタッフ用メモ',
            createdAt: '2026-01-10T09:00:00Z',
            updatedAt: '2026-01-15T12:00:00Z',
            isPinned: true,
            isPublic: true,
            viewableTags: [],
            documentIds: [],
            documents: []
          })
        ),
        http.delete('/v1/staff/pages/{pageID}', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffPageDetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
