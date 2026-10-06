import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import DetailPage from './detail.vue'
import { mockSessionBootstrap, mockCircle } from '@/mocks/data'
import { expect, userEvent, within } from 'storybook/test'

const meta = {
  title: 'Pages/Workspace/Circles/Detail',
  component: DetailPage,
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
        http.get('/v1/circles/current/detail', () => HttpResponse.json(mockCircle)),
        http.put('/v1/circles/current/detail', () => HttpResponse.json(mockCircle)),
        http.delete('/v1/circles/current', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof DetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Approved: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/circles/current/detail', () =>
          HttpResponse.json({
            ...mockCircle,
            status: 'approved',
            submittedAt: '2026-01-10T10:00:00Z'
          })
        )
      ]
    }
  }
}

export const SaveWithoutQuestions: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({ ...mockSessionBootstrap, currentCircle: { id: mockCircle.id, name: mockCircle.name } })
        ),
        http.get('/v1/circles/current/detail', () =>
          HttpResponse.json({ ...mockCircle, nameYomi: 'てすとさーくる', groupNameYomi: 'てすとぐるーぷ' })
        ),
        http.put('/v1/circles/current/detail', () =>
          HttpResponse.json({ ...mockCircle, nameYomi: 'てすとさーくる', groupNameYomi: 'てすとぐるーぷ' })
        )
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const save = await canvas.findByRole('button', { name: '保存する' })
    await userEvent.click(save)
    await expect(await canvas.findByText('企画参加登録の内容を保存しました。')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: '保存して次へ' }))
    await canvas.findByRole('heading', { name: '招待リンク' })
  }
}
