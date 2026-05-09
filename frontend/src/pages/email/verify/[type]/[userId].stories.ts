import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import EmailVerifyPage from './[userId].vue'
import { mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Auth/Email Verification Code Input',
  component: EmailVerifyPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/email/verify/univemail/user-1', query: { token: 'mock-token' } },
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
        http.post('/v1/auth/register/verify', () =>
          HttpResponse.json({
            pendingRegistrationId: 'reg-1',
            univemail: 's12345678@example.ac.jp',
            studentId: 'S12345678',
            verified: true
          })
        ),
        http.post('/v1/auth/register/complete', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof EmailVerifyPage>

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
        http.post('/v1/auth/register/verify', () =>
          HttpResponse.json({ message: '認証URLが無効か期限切れです。' }, { status: 422 })
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
        http.post('/v1/auth/register/verify', () =>
          HttpResponse.json({
            pendingRegistrationId: 'reg-1',
            univemail: 's12345678@example.ac.jp',
            studentId: 'S12345678',
            verified: true
          })
        ),
        http.post('/v1/auth/register/complete', () =>
          HttpResponse.json({ message: '入力内容に誤りがあります。' }, { status: 422 })
        )
      ]
    }
  }
}
