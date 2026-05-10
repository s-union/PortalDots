import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import DocumentsIndexPage from './index.vue'
import { mockSessionBootstrap, mockDocument } from '@/mocks/data'

const meta = {
  title: 'Pages/Workspace/Documents',
  component: DocumentsIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/documents', () =>
          HttpResponse.json({
            items: [
              mockDocument,
              { ...mockDocument, id: 'doc-2', name: '重要資料.pdf', isImportant: true, isNew: false }
            ],
            page: 1,
            pageSize: 10,
            total: 2
          })
        )
      ]
    }
  }
} satisfies Meta<typeof DocumentsIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/documents', () => HttpResponse.json({ items: [], page: 1, pageSize: 10, total: 0 }))
      ]
    }
  }
}
