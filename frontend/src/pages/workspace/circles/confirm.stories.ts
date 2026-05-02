import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import ConfirmPage from './confirm.vue'
import { mockSessionBootstrap, mockCircle } from '@/mocks/data'

const meta = {
  title: 'General Mode/Circle Creation Confirmation',
  component: ConfirmPage,
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
        http.get('/v1/circles/current/detail', () =>
          HttpResponse.json({
            ...mockCircle,
            canSubmit: true
          })
        ),
        http.post('/v1/circles/current/submit', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof ConfirmPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const CannotSubmit: Story = {
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
            canSubmit: false
          })
        )
      ]
    }
  }
}
