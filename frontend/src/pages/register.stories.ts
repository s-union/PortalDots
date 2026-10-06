import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import RegisterPage from './register.vue'
import { mockPublicConfig } from '@/mocks/data'
import { expect, userEvent, within } from 'storybook/test'

const meta = {
  title: 'Pages/Auth/Register',
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = await canvas.findByRole('textbox', { name: /大学メール/ })
    const submit = canvas.getByRole('button', { name: '認証URLを送信' })
    await userEvent.click(submit)
    await expect(canvas.getByText('大学メールアドレスを入力してください')).toBeVisible()
    await expect(input).toHaveFocus()
    await userEvent.type(input, '24z9999')
    await userEvent.click(submit)
    await expect(await canvas.findByText('確認メールを送信しました。')).toBeVisible()
  }
}

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
