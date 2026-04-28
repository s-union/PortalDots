import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import PublicDocumentsIndexPage from './index.vue'
import { mockDocument } from '@/mocks/data'

const meta = {
  title: 'Pages/Public/Documents/Index',
  component: PublicDocumentsIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
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
        http.get('/v1/public/documents', () =>
          HttpResponse.json([
            mockDocument,
            { ...mockDocument, id: 'doc-2', name: '重要資料.pdf', isImportant: true, isNew: false }
          ])
        )
      ]
    }
  }
} satisfies Meta<typeof PublicDocumentsIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
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
        http.get('/v1/public/documents', () => HttpResponse.json([]))
      ]
    }
  }
}
