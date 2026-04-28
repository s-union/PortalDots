import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffVerifyPage from './verify.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Verify',
  component: StaffVerifyPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: false })),
        http.post('/v1/staff/verify/request', () => HttpResponse.json({ message: '確認コードを送信しました。' })),
        http.post('/v1/staff/verify/confirm', () => HttpResponse.json({ authorized: true }))
      ]
    }
  }
} satisfies Meta<typeof StaffVerifyPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AlreadyAuthorized: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true }))
      ]
    }
  }
}
