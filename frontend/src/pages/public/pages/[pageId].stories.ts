import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import PageDetailPage from './[pageId].vue'
import { mockPageDetail, mockSessionBootstrap } from '@/mocks/data'

const meta = {
  title: 'Pages/Public/Announcements/Detail',
  component: PageDetailPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/public/pages/page-1' },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/public/pages/:pageId', () => HttpResponse.json(mockPageDetail))
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
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/public/pages/:pageId', () =>
          HttpResponse.json({
            ...mockPageDetail,
            documents: [
              {
                id: 'doc-1',
                name: '添付資料.pdf',
                extension: 'pdf',
                sizeBytes: 204800,
                isImportant: false,
                downloadUrl: '/v1/documents/doc-1/download'
              }
            ]
          })
        )
      ]
    }
  }
}

export const NotFound: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/public/pages/:pageId', () => new HttpResponse(null, { status: 404 }))
      ]
    }
  }
}
