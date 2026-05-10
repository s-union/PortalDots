import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import PageDetailPage from './[pageId].vue'
import { mockSessionBootstrap, mockPageDetail } from '@/mocks/data'

const meta = {
  title: 'Pages/Workspace/Pages/Detail',
  component: PageDetailPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/workspace/pages/page-1'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/pages/:pageID', () => HttpResponse.json(mockPageDetail))
      ]
    }
  }
} satisfies Meta<typeof PageDetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDocuments: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/pages/:pageID', () =>
          HttpResponse.json({
            ...mockPageDetail,
            documents: [
              {
                id: 'doc-1',
                name: '添付資料.pdf',
                description: 'テスト用の添付資料です。',
                extension: 'pdf',
                sizeBytes: 204800,
                isImportant: false,
                downloadUrl: '/v1/documents/doc-1/download',
                updatedAt: '2026-01-15T12:00:00Z'
              }
            ]
          })
        )
      ]
    }
  }
}

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/pages/:pageID', () => new HttpResponse(null, { status: 404 }))
      ]
    }
  }
}
