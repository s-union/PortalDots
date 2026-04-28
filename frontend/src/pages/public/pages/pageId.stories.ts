import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import PublicPageDetailPage from './[pageId].vue'
import { mockPageDetail } from '@/mocks/data'

const meta = {
  title: 'Pages/Public/Pages/Detail',
  component: PublicPageDetailPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/public/pages/page-1'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            csrfToken: 'mock-csrf-token',
            featureFlags: [],
            roles: [],
            permissions: [],
            currentCircle: null,
            user: null
          })
        ),
        http.get('/v1/public/pages/:pageID', () => HttpResponse.json(mockPageDetail))
      ]
    }
  }
} satisfies Meta<typeof PublicPageDetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDocuments: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            csrfToken: 'mock-csrf-token',
            featureFlags: [],
            roles: [],
            permissions: [],
            currentCircle: null,
            user: null
          })
        ),
        http.get('/v1/public/pages/:pageID', () =>
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
