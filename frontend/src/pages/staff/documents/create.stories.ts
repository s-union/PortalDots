import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffDocumentCreatePage from './create.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Documents/Create New',
  component: StaffDocumentCreatePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/tags', () =>
          HttpResponse.json([
            { id: 'tag-1', name: 'タグA', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
            { id: 'tag-2', name: 'タグB', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }
          ])
        ),
        http.get('/v1/staff/circles/managed', () =>
          HttpResponse.json([
            { id: 'circle-1', name: 'テストサークル' },
            { id: 'circle-2', name: 'サンプル企画' }
          ])
        ),
        http.post('/v1/staff/documents', () =>
          HttpResponse.json({
            circle: { id: 'circle-1', name: 'テストサークル' },
            id: 'doc-new',
            name: '新規配布資料.pdf',
            description: '新規作成された配布資料です。',
            notes: '',
            isImportant: false,
            filename: 'new.pdf',
            extension: 'pdf',
            mimeType: 'application/pdf',
            sizeBytes: 102400,
            isPublic: true,
            viewableTags: [],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            downloadUrl: '/v1/documents/doc-new/download'
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffDocumentCreatePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
