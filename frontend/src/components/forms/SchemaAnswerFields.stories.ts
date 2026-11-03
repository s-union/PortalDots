import type { Meta, StoryObj, VueRenderer } from '@storybook/vue3-vite'
import { useForm } from '@formisch/vue'
import { buildAnswerFormSchema, buildAnswerFormInput } from '@/features/forms/answer-form-schema'
import SchemaAnswerFields from './SchemaAnswerFields.vue'
import type { FormQuestion } from '@/features/forms/api'
import { toQuestionId } from '@/lib/api/schema'
import { expect, userEvent, within } from 'storybook/test'

const meta = {
  title: 'UI/Forms/SchemaAnswerFields',
  component: SchemaAnswerFields,
  tags: ['autodocs']
} satisfies Meta<typeof SchemaAnswerFields>

export default meta
type Story = StoryObj<VueRenderer>

const baseQuestion = {
  id: toQuestionId('q-1'),
  description: '',
  isRequired: true,
  isPermanent: false,
  numberMin: null,
  numberMax: null,
  allowedTypes: '',
  options: [] as string[],
  priority: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
} satisfies Omit<FormQuestion, 'name' | 'type'>

const textQuestion: FormQuestion = {
  ...baseQuestion,
  name: '企画名を入力してください',
  type: 'text'
}

const textareaQuestion: FormQuestion = {
  ...baseQuestion,
  id: toQuestionId('q-2'),
  name: '企画の説明を入力してください',
  type: 'textarea'
}

const markdownQuestion: FormQuestion = {
  ...baseQuestion,
  id: toQuestionId('q-md'),
  name: '企画紹介文を入力してください',
  description: '見出し、箇条書き、リンクなどを Markdown で入力できます。',
  type: 'markdown',
  numberMax: 1000
}

const numberQuestion: FormQuestion = {
  ...baseQuestion,
  id: toQuestionId('q-3'),
  name: '参加人数を入力してください',
  type: 'number',
  numberMin: 1,
  numberMax: 50
}

const selectQuestion: FormQuestion = {
  ...baseQuestion,
  id: toQuestionId('q-4'),
  name: '希望時間帯を選んでください',
  type: 'select',
  options: ['午前（10:00〜12:00）', '午後（13:00〜15:00）', '夕方（16:00〜18:00）']
}

const radioQuestion: FormQuestion = {
  ...baseQuestion,
  id: toQuestionId('q-5'),
  name: '屋外使用を希望しますか？',
  type: 'radio',
  options: ['はい', 'いいえ', '未定']
}

const checkboxQuestion: FormQuestion = {
  ...baseQuestion,
  id: toQuestionId('q-6'),
  name: '必要な機材を選んでください（複数選択可）',
  type: 'checkbox',
  options: ['机（4人用）', 'イス', '電源', '延長コード']
}

const uploadQuestion: FormQuestion = {
  ...baseQuestion,
  id: toQuestionId('q-7'),
  name: 'チラシのPDFをアップロードしてください',
  type: 'upload'
}

function renderQuestion(question: FormQuestion, disabled = false) {
  return {
    components: { SchemaAnswerFields },
    setup() {
      const schema = buildAnswerFormSchema([question])
      const initialInput = buildAnswerFormInput(schema, null)
      if (disabled) initialInput.text[question.id] = '企画名のサンプル'
      const form = useForm({ schema, initialInput, validate: 'blur', revalidate: 'input' })
      return { schema, form, disabled }
    },
    template: `
      <SchemaAnswerFields
        :schema="schema" :form="form" :answer="null" :disabled="disabled"
        :selected-files="{}" :upload-pending="false" :upload-error-messages="{}"
        :download-href="() => ''"
      />
    `
  }
}

export const TextInput: Story = { render: () => renderQuestion(textQuestion) }
export const Textarea: Story = { render: () => renderQuestion(textareaQuestion) }
export const Markdown: Story = { render: () => renderQuestion(markdownQuestion) }
export const NumberSelect: Story = { render: () => renderQuestion(numberQuestion) }
export const Select: Story = { render: () => renderQuestion(selectQuestion) }
export const Radio: Story = { render: () => renderQuestion(radioQuestion) }
export const Checkbox: Story = { render: () => renderQuestion(checkboxQuestion) }
export const RemovedCheckboxSelection: Story = {
  render: () => ({
    components: { SchemaAnswerFields },
    setup() {
      const schema = buildAnswerFormSchema([checkboxQuestion])
      const initialInput = buildAnswerFormInput(schema, null)
      initialInput.choices[checkboxQuestion.id] = ['旧機材']
      const form = useForm({ schema, initialInput, validate: 'blur', revalidate: 'input' })
      return { schema, form }
    },
    template: `
      <SchemaAnswerFields
        :schema="schema" :form="form" :answer="null" :disabled="false"
        :selected-files="{}" :upload-pending="false" :upload-error-messages="{}"
        :download-href="() => ''"
      />
    `
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const removed = await canvas.findByRole('checkbox', { name: '旧機材（現在は選べません）' })
    removed.focus()
    await expect(removed).toHaveFocus()
    await userEvent.keyboard(' ')
    await expect(canvas.getByRole('checkbox', { name: '机（4人用）' })).toHaveFocus()
    await expect(canvas.queryByRole('checkbox', { name: '旧機材（現在は選べません）' })).not.toBeInTheDocument()
  }
}
export const FileUpload: Story = { render: () => renderQuestion(uploadQuestion) }
export const Disabled: Story = { render: () => renderQuestion(textQuestion, true) }
