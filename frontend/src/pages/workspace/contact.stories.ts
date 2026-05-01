import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import ContactPage from './contact.vue'
import { mockSessionBootstrap, mockContactCategory } from '@/mocks/data'

const meta = {
  title: '一般モード/お問い合わせ',
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
        http.post('/v1/contact', () => new HttpResponse(null, { status: 204 }))
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
