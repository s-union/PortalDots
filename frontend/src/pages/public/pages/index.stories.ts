import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import PublicPagesIndexPage from './index.vue'
import { mockPage } from '@/mocks/data'

const meta = {
  title: 'Public Mode/Public Announcements List',
  component: PublicPagesIndexPage,
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
        http.get('/v1/public/pages', () =>
          HttpResponse.json({
            items: [mockPage, { ...mockPage, id: 'page-2', title: '2つ目のお知らせ', isNew: false }],
            page: 1,
            pageSize: 10,
            total: 2
          })
        )
      ]
    }
  }
} satisfies Meta<typeof PublicPagesIndexPage>

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
        http.get('/v1/public/pages', () => HttpResponse.json({ items: [], page: 1, pageSize: 10, total: 0 }))
      ]
    }
  }
}

export const LimitedAndLongText: Story = {
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
        http.get('/v1/public/pages', () =>
          HttpResponse.json({
            items: [
              {
                ...mockPage,
                id: 'page-limited',
                title: '参加団体向けの重要なお知らせ',
                summary:
                  '参加団体の責任者と副責任者に向けた、長めの説明文を含むお知らせです。折り返しやバッジ表示を確認できます。',
                isLimited: true,
                isNew: true
              },
              {
                ...mockPage,
                id: 'page-old',
                title: '過去のお知らせ',
                summary: '既読・通常公開のお知らせです。',
                isLimited: false,
                isNew: false
              }
            ],
            page: 1,
            pageSize: 10,
            total: 2
          })
        )
      ]
    }
  }
}
