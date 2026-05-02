import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import AccountVerifyPage from './[userId].vue'
import { mockSessionBootstrap, mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Auth/Email Address Change Verification',
  component: AccountVerifyPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.post('/v1/auth/verification/verify', () => HttpResponse.json({ completed: true }))
      ]
    }
  }
} satisfies Meta<typeof AccountVerifyPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const PartialCompleted: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.post('/v1/auth/verification/verify', () => HttpResponse.json({ completed: false }))
      ]
    }
  }
}

export const VerifyError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.post('/v1/auth/verification/verify', () =>
          HttpResponse.json({ message: '認証URLが無効か期限切れです。' }, { status: 422 })
        )
      ]
    }
  }
}
