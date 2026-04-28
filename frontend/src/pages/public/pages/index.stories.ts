import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import PublicPagesIndexPage from './index.vue'
import { mockPage } from '@/mocks/data'

const meta = {
  title: 'Pages/Public/Pages/Index',
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
