import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import PasswordResetPage from './[userId].vue'
import { mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Auth/Password Reset Confirmation',
  component: PasswordResetPage,
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
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.post('/v1/auth/password/reset/verify', () => HttpResponse.json({ userId: 'user-1', valid: true })),
        http.post('/v1/auth/password/reset/complete', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof PasswordResetPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const VerifyError: Story = {
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
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.post('/v1/auth/password/reset/verify', () =>
          HttpResponse.json({ message: '再設定URLが無効か期限切れです。' }, { status: 422 })
        )
      ]
    }
  }
}

export const SubmitError: Story = {
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
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.post('/v1/auth/password/reset/verify', () => HttpResponse.json({ userId: 'user-1', valid: true })),
        http.post('/v1/auth/password/reset/complete', () =>
          HttpResponse.json({ message: 'パスワードの再設定に失敗しました。' }, { status: 422 })
        )
      ]
    }
  }
}

export const Completed: Story = {
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
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.post('/v1/auth/password/reset/verify', () => HttpResponse.json({ userId: 'user-1', valid: true })),
        http.post('/v1/auth/password/reset/complete', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
}
