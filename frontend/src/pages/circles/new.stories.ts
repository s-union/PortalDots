import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import NewCirclePage from './new.vue'
import { mockSessionBootstrap, mockParticipationType, mockCircle } from '@/mocks/data'
import { expect, userEvent, waitFor, within } from 'storybook/test'

const registration = {
  ...mockCircle,
  id: '',
  name: '',
  nameYomi: '',
  groupName: '',
  groupNameYomi: '',
  participationTypeId: mockParticipationType.id,
  formId: mockParticipationType.form.id,
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
let createdPayload: unknown

const canCreateSession = {
  ...mockSessionBootstrap,
  user: { ...mockSessionBootstrap.user!, canCreateCircleRegistration: true }
}

const cannotCreateSession = {
  ...mockSessionBootstrap,
  user: { ...mockSessionBootstrap.user!, canCreateCircleRegistration: false }
}

const meta = {
  title: 'Pages/Circle Registration/Create New',
  component: NewCirclePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    session: {
      bootstrap: canCreateSession
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(canCreateSession)),
        http.get('/v1/participation-types', () => HttpResponse.json([mockParticipationType])),
        http.get('/v1/participation-types/{typeID}/registration-form', () => HttpResponse.json(registration)),
        http.post('/v1/circles', async ({ request }) => {
          createdPayload = await request.json()
          return HttpResponse.json({ ...mockCircle, id: 'circle-new' }, { status: 201 })
        })
      ]
    }
  }
} satisfies Meta<typeof NewCirclePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  beforeEach: () => {
    createdPayload = undefined
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const type = await canvas.findByRole('combobox', { name: /参加種別/ })
    await waitFor(() => expect(canvas.getByRole('option', { name: /一般参加/ })).toBeVisible())
    await userEvent.selectOptions(type, mockParticipationType.id)
    const description = await canvas.findByRole('textbox', { name: '出店内容' })
    await userEvent.type(canvas.getByRole('textbox', { name: /^企画名 \*/ }), '展示企画')
    await userEvent.type(canvas.getByRole('textbox', { name: /企画名（よみ）/ }), 'てんじきかく')
    await userEvent.type(canvas.getByRole('textbox', { name: /^企画を出店する団体の名称 \*/ }), '展示団体')
    await userEvent.type(canvas.getByRole('textbox', { name: /団体の名称（よみ）/ }), 'てんじだんたい')
    const save = canvas.getByRole('button', { name: '保存して次へ' })
    await userEvent.click(save)
    await expect(canvas.getByText('出店内容を入力してください')).toBeVisible()
    await expect(createdPayload).toBeUndefined()
    await userEvent.type(description, '展示ブース')
    await userEvent.click(save)
    await waitFor(() =>
      expect(createdPayload).toMatchObject({
        name: '展示企画',
        participationTypeId: mockParticipationType.id,
        details: { 'question-description': '展示ブース' }
      })
    )
    await canvas.findByRole('heading', { name: '招待リンク' })
  }
}

export const CannotCreate: Story = {
  tags: ['!autodocs'],
  parameters: {
    session: {
      bootstrap: cannotCreateSession
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(cannotCreateSession)),
        http.get('/v1/participation-types', () => HttpResponse.json([]))
      ]
    }
  }
}
