import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import PagesIndexPage from './index.vue'
import { mockSessionBootstrap, mockPage } from '@/mocks/data'

const meta = {
  title: 'Pages/Workspace/Pages',
  component: PagesIndexPage,
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
        http.get('/v1/pages', () =>
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
} satisfies Meta<typeof PagesIndexPage>

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
        http.get('/v1/pages', () => HttpResponse.json({ items: [], page: 1, pageSize: 10, total: 0 }))
      ]
    }
  }
}
