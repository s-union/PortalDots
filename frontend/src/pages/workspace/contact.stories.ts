import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import ContactPage from './contact.vue'
import { mockSessionBootstrap, mockContactCategory } from '@/mocks/data'
import { expect, userEvent, waitFor, within } from 'storybook/test'

const meta = {
  title: 'Pages/Workspace/Contact',
  component: ContactPage,
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
        http.get('/v1/contact-categories', () => HttpResponse.json([mockContactCategory])),
        http.post('/v1/contact', () =>
          HttpResponse.json(
            {
              id: 'contact-job-1',
              categoryId: mockContactCategory.id,
              categoryName: mockContactCategory.name,
              subject: mockContactCategory.name,
              status: 'queued',
              createdAt: '2026-03-13T10:00:00Z'
            },
            { status: 201 }
          )
        )
      ]
    }
  }
} satisfies Meta<typeof ContactPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ValidationAndSubmission: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const category = await canvas.findByLabelText(/お問い合わせ項目/)
    const body = canvas.getByLabelText(/お問い合わせ内容/)
    const submit = canvas.getByRole('button', { name: '送信' })
    await waitFor(() => expect(submit).toBeEnabled())
    await userEvent.click(submit)
    await expect(category).toHaveFocus()
    await expect(category).toHaveAttribute('aria-describedby', 'contact-category-error')
    await userEvent.selectOptions(category, mockContactCategory.id)
    await userEvent.click(submit)
    await expect(body).toHaveFocus()
    await expect(body).toHaveAttribute('aria-describedby', 'contact-body-error')
    await userEvent.type(body, '搬入時刻を確認したいです。')
    await userEvent.click(submit)
    await expect(await canvas.findByText(`「${mockContactCategory.name}」に問い合わせを送信しました。`)).toBeVisible()
    await expect(body).toHaveValue('')
    await expect(body).toHaveAttribute('aria-invalid', 'false')
    await expect(canvas.queryByText('お問い合わせ内容を入力してください')).not.toBeInTheDocument()
  }
}

export const NoCategories: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/contact-categories', () => HttpResponse.json([]))
      ]
    }
  }
}
