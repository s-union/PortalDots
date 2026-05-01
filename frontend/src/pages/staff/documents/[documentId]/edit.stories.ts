import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffDocumentEditPage from './edit.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'スタッフモード/配布資料管理/編集',
  component: StaffDocumentEditPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/documents/doc-1/edit'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/documents/:documentID/edit', () =>
          HttpResponse.json({
            circle: { id: 'circle-1', name: 'テストサークル' },
            id: 'doc-1',
            name: 'テスト配布資料.pdf',
            description: 'テスト用の配布資料です。',
            notes: 'スタッフ用メモ',
            isImportant: false,
            filename: 'test.pdf',
            extension: 'pdf',
            mimeType: 'application/pdf',
            sizeBytes: 204800,
            isPublic: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-15T12:00:00Z',
            downloadUrl: '/v1/documents/doc-1/download'
          })
        ),
        http.put('/v1/staff/documents/:documentID', () =>
          HttpResponse.json({
            circle: { id: 'circle-1', name: 'テストサークル' },
            id: 'doc-1',
            name: 'テスト配布資料.pdf',
            description: 'テスト用の配布資料です。',
            notes: 'スタッフ用メモ',
            isImportant: false,
            filename: 'test.pdf',
            extension: 'pdf',
            mimeType: 'application/pdf',
            sizeBytes: 204800,
            isPublic: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-15T12:00:00Z',
            downloadUrl: '/v1/documents/doc-1/download'
          })
        ),
        http.delete('/v1/staff/documents/:documentID', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffDocumentEditPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
