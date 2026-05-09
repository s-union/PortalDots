import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import DonePage from './done.vue'
import { mockSessionBootstrap, mockCircle } from '@/mocks/data'

const meta = {
  title: 'General Mode/Circle Creation Complete',
  component: DonePage,
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
        http.get('/v1/circles/current/detail', () => HttpResponse.json(mockCircle))
      ]
    }
  }
} satisfies Meta<typeof DonePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutConfirmationMessage: Story = {
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
            confirmationMessage: ''
          })
        )
      ]
    }
  }
}
