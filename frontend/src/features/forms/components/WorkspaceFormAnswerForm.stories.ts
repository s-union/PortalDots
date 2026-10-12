import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { FormAnswerDraft } from '@/features/forms/answers'
import { toAnswerId, toFormId, toQuestionId } from '@/lib/api/schema'
import WorkspaceFormAnswerForm from './WorkspaceFormAnswerForm.vue'

const question = {
  description: '',
  isRequired: true,
  isPermanent: false,
  numberMin: null,
  numberMax: null,
  allowedTypes: '',
  priority: 1,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z'
}

const meta = {
  title: 'Features/Forms/SchemaAnswerEditor',
  component: WorkspaceFormAnswerForm,
  args: {
    form: {
      id: toFormId('form-demo'),
      name: '参加申請',
      description: '',
      openAt: '2026-03-01T00:00:00Z',
      closeAt: '2026-03-31T23:59:59Z',
      isOpen: true,
      isPublic: true,
      currentCircleStatus: 'approved',
      maxAnswers: 1,
      answerableTags: [],
      confirmationMessage: '',
      questions: [
        { ...question, id: toQuestionId('equipment'), name: '備品', type: 'checkbox', options: ['机', '椅子'] },
        { ...question, id: toQuestionId('name'), name: '企画名', type: 'text', options: [] },
        {
          ...question,
          id: toQuestionId('count'),
          name: '人数',
          type: 'number',
          numberMin: 1,
          numberMax: 500,
          options: []
        }
      ]
    },
    answer: null,
    disabled: false,
    selectedFiles: {},
    uploadPending: false,
    uploadErrorMessages: {},
    errorMessage: '',
    downloadHref: () => '',
    saveAnswer: fn(async (draft: FormAnswerDraft) => ({
      id: toAnswerId('answer-demo'),
      body: '',
      updatedAt: '2026-03-02T00:00:00Z',
      uploads: [],
      details: Object.fromEntries(
        Object.entries(draft).map(([id, value]) => [id, Array.isArray(value) ? value : [value]])
      )
    }))
  }
} satisfies Meta<typeof WorkspaceFormAnswerForm>

export default meta
type Story = StoryObj<typeof meta>

export const TypedFields: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const submit = await canvas.findByRole('button', { name: '送信' })
    const checkbox = canvas.getByRole('checkbox', { name: '机' })
    await userEvent.click(submit)
    await waitFor(() => expect(checkbox).toHaveFocus())
    await expect(args.saveAnswer).not.toHaveBeenCalled()

    await userEvent.click(checkbox)
    await userEvent.type(canvas.getByRole('textbox', { name: /^企画名/ }), '展示企画')
    const count = canvas.getByRole('spinbutton', { name: /^人数/ })
    await userEvent.type(count, '1.5')
    await userEvent.click(submit)
    await expect(canvas.getByText('整数を入力してください')).toBeVisible()
    await expect(args.saveAnswer).not.toHaveBeenCalled()

    await userEvent.clear(count)
    await userEvent.type(count, '10')
    await userEvent.click(submit)
    await waitFor(() =>
      expect(args.saveAnswer).toHaveBeenCalledWith({ equipment: ['机'], name: '展示企画', count: '10' })
    )
    await expect(submit).toBeEnabled()
  }
}
