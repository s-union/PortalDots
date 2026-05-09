import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import RegisterPage from './register.vue'
import { mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Auth/Register',
  component: RegisterPage,
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
        http.post('/v1/auth/register/start', () => HttpResponse.json({ message: '確認メールを送信しました。' }))
      ]
    }
  }
} satisfies Meta<typeof RegisterPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithSubmitError: Story = {
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
        http.post('/v1/auth/register/start', () =>
          HttpResponse.json({ message: 'このメールアドレスはすでに登録されています。' }, { status: 422 })
        )
      ]
    }
  }
}
