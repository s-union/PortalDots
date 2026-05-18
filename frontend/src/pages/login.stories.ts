import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import LoginPage from './login.vue'

const meta = {
  title: 'Pages/Auth/Login',
  component: LoginPage,
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
        http.post('/v1/auth/login', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof LoginPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithLoginError: Story = {
  parameters: {
    layout: 'fullscreen',
    errorMessage: 'ログインIDまたはパスワードが正しくありません。',
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
        http.post('/v1/auth/login', () =>
          HttpResponse.json({ message: 'ログインIDまたはパスワードが正しくありません。' }, { status: 401 })
        )
      ]
    }
  }
}
