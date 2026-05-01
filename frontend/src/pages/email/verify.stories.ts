import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import VerifyPage from './verify.vue'
import { mockSessionBootstrap } from '@/mocks/data'

const meta = {
  title: '認証/メール認証',
  component: VerifyPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/auth/verification', () =>
          HttpResponse.json({
            userId: 'user-1',
            displayName: '山田 太郎',
            completed: false,
            items: [
              { type: 'email', label: '連絡先メールアドレス', address: 'taro@example.com', verified: true },
              { type: 'univemail', label: '大学メール', address: 's12345678@example.ac.jp', verified: false }
            ]
          })
        )
      ]
    }
  }
} satisfies Meta<typeof VerifyPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AllVerified: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/auth/verification', () =>
          HttpResponse.json({
            userId: 'user-1',
            displayName: '山田 太郎',
            completed: true,
            items: [
              { type: 'email', label: '連絡先メールアドレス', address: 'taro@example.com', verified: true },
              { type: 'univemail', label: '大学メール', address: 's12345678@example.ac.jp', verified: true }
            ]
          })
        )
      ]
    }
  }
}
