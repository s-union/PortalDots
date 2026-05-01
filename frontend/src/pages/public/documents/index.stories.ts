import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import PublicDocumentsIndexPage from './index.vue'
import { mockDocument } from '@/mocks/data'

const meta = {
  title: '一般モード/公開配布資料一覧',
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

export const ImportantAndLongNames: Story = {
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
        http.get('/v1/public/documents', () =>
          HttpResponse.json([
            {
              ...mockDocument,
              id: 'doc-important',
              name: '重要_参加団体向け提出資料チェックリスト_最新版.pdf',
              description: '重要な提出前チェックリストです。長いファイル名の表示を確認できます。',
              isImportant: true
            },
            {
              ...mockDocument,
              id: 'doc-archive',
              name: '会場図面.zip',
              extension: 'zip',
              sizeBytes: 8_388_608,
              isNew: false
            }
          ])
        )
      ]
    }
  }
}
