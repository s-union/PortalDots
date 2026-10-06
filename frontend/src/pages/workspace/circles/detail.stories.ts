import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import DetailPage from './detail.vue'
import { mockSessionBootstrap, mockCircle } from '@/mocks/data'
import { expect, userEvent, waitFor, within } from 'storybook/test'

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

const mixedCircle = {
  ...mockCircle,
  nameYomi: 'てすとさーくる',
  groupNameYomi: 'てすとぐるーぷ',
  questions: [
    {
      id: 'question-description',
      name: '出店内容',
      description: '',
      type: 'text',
      isRequired: true,
      numberMin: null,
      numberMax: null,
      allowedTypes: '',
      options: [],
      priority: 1,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z'
    }
  ]
}
const savedMixedCircle = {
  ...mixedCircle,
  name: '展示企画',
  answer: {
    id: 'answer-circle',
    body: '',
    details: { 'question-description': ['展示ブース'] },
    uploads: [],
    updatedAt: '2026-03-01T00:00:00Z'
  }
}
let combinedPayload: unknown

export const ValidateBasicInformationAndAnswers: Story = {
  beforeEach: () => {
    combinedPayload = undefined
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({ ...mockSessionBootstrap, currentCircle: { id: mockCircle.id, name: mockCircle.name } })
        ),
        http.get('/v1/circles/current/detail', () =>
          HttpResponse.json(combinedPayload ? savedMixedCircle : mixedCircle)
        ),
        http.put('/v1/circles/current/detail', async ({ request }) => {
          combinedPayload = await request.json()
          return HttpResponse.json(savedMixedCircle)
        })
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const name = await canvas.findByRole('textbox', { name: /^企画名 \*/ })
    const description = canvas.getByRole('textbox', { name: '出店内容' })
    const save = canvas.getByRole('button', { name: '保存する' })
    await userEvent.clear(name)
    await userEvent.click(save)
    await expect(canvas.getByText('企画名を入力してください')).toBeVisible()
    await expect(canvas.getByText('出店内容を入力してください')).toBeVisible()
    await expect(name).toHaveFocus()
    await expect(combinedPayload).toBeUndefined()
    await userEvent.type(name, '展示企画')
    await userEvent.click(save)
    await expect(description).toHaveFocus()
    await expect(combinedPayload).toBeUndefined()
    await userEvent.type(description, '展示ブース')
    await userEvent.click(save)
    await waitFor(() =>
      expect(combinedPayload).toMatchObject({ name: '展示企画', details: { 'question-description': '展示ブース' } })
    )
    await expect(await canvas.findByText('企画参加登録の内容を保存しました。')).toBeVisible()
    await expect(canvas.queryByText('企画名を入力してください')).not.toBeInTheDocument()
    await expect(canvas.queryByText('出店内容を入力してください')).not.toBeInTheDocument()
  }
}
