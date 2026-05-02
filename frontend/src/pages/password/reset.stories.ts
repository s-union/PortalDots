import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import ResetPage from './reset.vue'
import { mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Auth/Password Reset',
  component: ResetPage,
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
        http.post('/v1/auth/password/reset/start', () =>
          HttpResponse.json({ message: 'パスワードリセットメールを送信しました。' })
        )
      ]
    }
  }
} satisfies Meta<typeof ResetPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
