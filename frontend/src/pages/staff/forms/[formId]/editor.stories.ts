import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { parseStaffFormQuestion, type StaffFormQuestion } from '@/features/staff/forms/api'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffFormEditorPage from './editor.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'
import { staffFormStoryDetail, staffFormStoryQuestions } from '../story-fixtures'

const meta = {
  title: 'Pages/Staff/Forms/Editor',
  component: StaffFormEditorPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/forms/form-circle-b-1/editor'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/{formID}', () => HttpResponse.json(staffFormStoryDetail)),
        http.put('/v1/staff/forms/{formID}', () =>
          HttpResponse.json({
            ...staffFormStoryDetail,
            questions: undefined,
            answer: undefined,
            updatedAt: '2026-03-09T10:00:00Z'
          })
        ),
        http.post('/v1/staff/forms/{formID}/questions', () =>
          HttpResponse.json(
            {
              id: 'question-new',
              name: '',
              description: '',
              type: 'text',
              isRequired: false,
              numberMin: null,
              numberMax: null,
              allowedTypes: '',
              options: [],
              priority: staffFormStoryQuestions.length + 1,
              createdAt: '2026-03-09T10:00:00Z',
              updatedAt: '2026-03-09T10:00:00Z'
            },
            { status: 201 }
          )
        ),
        http.put('/v1/staff/forms/{formID}/questions/{questionID}', ({ params }) =>
          HttpResponse.json({
            ...staffFormStoryQuestions.find((question) => question.id === params.questionID),
            updatedAt: '2026-03-09T10:00:00Z'
          })
        ),
        http.put('/v1/staff/forms/{formID}/questions/order', () => new HttpResponse(null, { status: 204 })),
        http.delete('/v1/staff/forms/{formID}/questions/{questionID}', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffFormEditorPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const EmptyForm: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/{formID}', () => HttpResponse.json({ ...staffFormStoryDetail, questions: [] }))
      ]
    }
  }
}

const autosaveQuestions = [
  parseStaffFormQuestion({ ...staffFormStoryQuestions[1], id: 'autosave-a', name: '設問 A', priority: 1 }),
  parseStaffFormQuestion({ ...staffFormStoryQuestions[2], id: 'autosave-b', name: '設問 B', priority: 2 })
]
let currentQuestions: StaffFormQuestion[] = []
let releaseSave = () => {}
let pendingSave = Promise.resolve()
let submittedPayloads: unknown[] = []
let refreshes = 0

export const AutosavePreservesDraft: Story = {
  beforeEach: () => {
    currentQuestions = autosaveQuestions.map((question) => ({ ...question }))
    pendingSave = new Promise<void>((resolve) => {
      releaseSave = resolve
    })
    submittedPayloads = []
    refreshes = 0
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/{formID}', () => {
          refreshes++
          return HttpResponse.json({ ...staffFormStoryDetail, questions: currentQuestions })
        }),
        http.put('/v1/staff/forms/{formID}/questions/{questionID}', async ({ request, params }) => {
          const body: unknown = await request.json()
          submittedPayloads.push(body)
          if (params.questionID === 'autosave-a') await pendingSave
          if (!body || typeof body !== 'object') return new HttpResponse(null, { status: 400 })
          const saved = parseStaffFormQuestion({
            ...currentQuestions.find((question) => question.id === params.questionID),
            ...body
          })
          currentQuestions = currentQuestions.map((question) => (question.id === saved.id ? saved : question))
          return HttpResponse.json(saved)
        })
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const firstName = await canvas.findByDisplayValue('設問 A')
    const firstArticle = firstName.closest('article')
    if (!firstArticle) throw new Error('First question must be rendered')
    await userEvent.click(within(firstArticle).getByRole('button', { expanded: false }))
    await userEvent.clear(firstName)
    await userEvent.type(firstName, '保存する設問 A')
    const secondName = canvas.getByDisplayValue('設問 B')
    const secondArticle = secondName.closest('article')
    if (!secondArticle) throw new Error('Second question must be rendered')
    await userEvent.click(within(secondArticle).getByRole('button', { expanded: false }))
    await waitFor(() => expect(submittedPayloads).toHaveLength(1))
    const second = within(secondArticle)
    const options = second.getByRole('textbox', { name: '選択肢' })
    await userEvent.clear(options)
    await userEvent.type(options, '  選択 A  \n選択 A\n\n選択 B\n')
    await expect(canvas.getByRole('button', { name: /^≡\s*一行入力$/ })).toBeDisabled()
    releaseSave()
    await waitFor(() => expect(refreshes).toBeGreaterThan(1))
    await waitFor(() => expect(canvas.getByRole('button', { name: /^≡\s*一行入力$/ })).toBeEnabled())
    await expect(options).toHaveValue('  選択 A  \n選択 A\n\n選択 B\n')
    await expect(canvas.getByText('未保存の変更があります')).toBeVisible()
    await userEvent.click(second.getByRole('button', { name: /^保存$/ }))
    await waitFor(() => expect(options).toHaveValue('選択 A\n選択 B'))
    await expect(submittedPayloads).toEqual([
      {
        name: '保存する設問 A',
        description: '当日連絡が取れる責任者名を入力してください。',
        type: 'text',
        isRequired: true,
        numberMin: null,
        numberMax: null,
        allowedTypes: '',
        options: [],
        priority: 1
      },
      {
        name: '設問 B',
        description: '使用予定の機材を選択してください。',
        type: 'checkbox',
        isRequired: false,
        numberMin: null,
        numberMax: null,
        allowedTypes: '',
        options: ['選択 A', '選択 B'],
        priority: 2
      }
    ])
    await expect(canvas.queryByText('未保存の変更があります')).not.toBeInTheDocument()

    await userEvent.clear(second.getByRole('textbox', { name: '設問名' }))
    await userEvent.click(second.getByRole('button', { name: /^保存$/ }))
    await expect(second.getByText('設問名を入力してください')).toBeVisible()
    await expect(second.getByRole('textbox', { name: '設問名' })).toHaveFocus()
    await expect(submittedPayloads).toHaveLength(2)
    await userEvent.type(second.getByRole('textbox', { name: '設問名' }), '設問 B')
  }
}
