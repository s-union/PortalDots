import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffDocumentsIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockDocument, mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Documents/Index',
  component: StaffDocumentsIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/documents', () =>
          HttpResponse.json({
            items: [
              {
                circle: { id: '', name: '' },
                ...mockDocument,
                notes: '',
                filename: 'test.pdf',
                mimeType: 'application/pdf',
                isPublic: true,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-15T12:00:00Z'
              }
            ],
            page: 1,
            pageSize: 20,
            total: 1
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffDocumentsIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
