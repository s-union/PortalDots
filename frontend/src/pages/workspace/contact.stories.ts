import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import ContactPage from './contact.vue'
import { mockSessionBootstrap, mockContactCategory } from '@/mocks/data'

const meta = {
  title: 'Pages/Workspace/Contact',
  component: ContactPage,
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
        http.get('/v1/contact-categories', () => HttpResponse.json([mockContactCategory])),
        http.post('/v1/contact', () =>
          HttpResponse.json(
            {
              id: 'contact-job-1',
              categoryId: mockContactCategory.id,
              categoryName: mockContactCategory.name,
              subject: mockContactCategory.name,
              status: 'queued',
              createdAt: '2026-03-13T10:00:00Z'
            },
            { status: 201 }
          )
        )
      ]
    }
  }
} satisfies Meta<typeof ContactPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoCategories: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/contact-categories', () => HttpResponse.json([]))
      ]
    }
  }
}
