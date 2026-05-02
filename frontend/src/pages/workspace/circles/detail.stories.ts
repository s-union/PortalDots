import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import DetailPage from './detail.vue'
import { mockSessionBootstrap, mockCircle } from '@/mocks/data'

const meta = {
  title: 'General Mode/Circle Detail',
  component: DetailPage,
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
        http.get('/v1/circles/current/detail', () => HttpResponse.json(mockCircle)),
        http.put('/v1/circles/current', () => HttpResponse.json(mockCircle)),
        http.delete('/v1/circles/current', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof DetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Approved: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/circles/current/detail', () =>
          HttpResponse.json({
            ...mockCircle,
            status: 'approved',
            submittedAt: '2026-01-10T10:00:00Z'
          })
        )
      ]
    }
  }
}
