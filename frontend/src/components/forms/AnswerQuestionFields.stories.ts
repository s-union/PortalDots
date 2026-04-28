import type { Meta, StoryObj, VueRenderer } from '@storybook/vue3-vite'
import { ref } from 'vue'
import AnswerQuestionFields from './AnswerQuestionFields.vue'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswerDraft } from '@/features/forms/answers'

const meta = {
  title: 'UI/Forms/AnswerQuestionFields',
  component: AnswerQuestionFields,
  tags: ['autodocs']
} satisfies Meta<typeof AnswerQuestionFields>

export default meta
type Story = StoryObj<VueRenderer>

const baseQuestion = {
  id: 'q-1',
  description: '',
  isRequired: true,
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
  id: 'q-2',
  name: '企画の説明を入力してください',
  type: 'textarea'
}

const numberQuestion: FormQuestion = {
  ...baseQuestion,
  id: 'q-3',
  name: '参加人数を入力してください',
  type: 'number',
  numberMin: 1,
  numberMax: 50
}

const selectQuestion: FormQuestion = {
  ...baseQuestion,
  id: 'q-4',
  name: '希望時間帯を選んでください',
  type: 'select',
  options: ['午前（10:00〜12:00）', '午後（13:00〜15:00）', '夕方（16:00〜18:00）']
}

const radioQuestion: FormQuestion = {
  ...baseQuestion,
  id: 'q-5',
  name: '屋外使用を希望しますか？',
  type: 'radio',
  options: ['はい', 'いいえ', '未定']
}

const checkboxQuestion: FormQuestion = {
  ...baseQuestion,
  id: 'q-6',
  name: '必要な機材を選んでください（複数選択可）',
  type: 'checkbox',
  options: ['机（4人用）', 'イス', '電源', '延長コード']
}

const uploadQuestion: FormQuestion = {
  ...baseQuestion,
  id: 'q-7',
  name: 'チラシのPDFをアップロードしてください',
  type: 'upload'
}

export const TextInput: Story = {
  render: () => ({
    components: { AnswerQuestionFields },
    setup() {
      const draft = ref<FormAnswerDraft>({})
      return { draft, question: textQuestion }
    },
    template: `
      <AnswerQuestionFields
        :answer="null"
        :draft="draft"
        :question="question"
        upload-button-label="アップロード"
        :download-href="() => ''"
      />
    `
  })
}

export const Textarea: Story = {
  render: () => ({
    components: { AnswerQuestionFields },
    setup() {
      const draft = ref<FormAnswerDraft>({})
      return { draft, question: textareaQuestion }
    },
    template: `
      <AnswerQuestionFields
        :answer="null"
        :draft="draft"
        :question="question"
        upload-button-label="アップロード"
        :download-href="() => ''"
      />
    `
  })
}

export const NumberInput: Story = {
  render: () => ({
    components: { AnswerQuestionFields },
    setup() {
      const draft = ref<FormAnswerDraft>({})
      return { draft, question: numberQuestion }
    },
    template: `
      <AnswerQuestionFields
        :answer="null"
        :draft="draft"
        :question="question"
        upload-button-label="アップロード"
        :download-href="() => ''"
      />
    `
  })
}

export const Select: Story = {
  render: () => ({
    components: { AnswerQuestionFields },
    setup() {
      const draft = ref<FormAnswerDraft>({})
      return { draft, question: selectQuestion }
    },
    template: `
      <AnswerQuestionFields
        :answer="null"
        :draft="draft"
        :question="question"
        upload-button-label="アップロード"
        :download-href="() => ''"
      />
    `
  })
}

export const Radio: Story = {
  render: () => ({
    components: { AnswerQuestionFields },
    setup() {
      const draft = ref<FormAnswerDraft>({})
      return { draft, question: radioQuestion }
    },
    template: `
      <AnswerQuestionFields
        :answer="null"
        :draft="draft"
        :question="question"
        upload-button-label="アップロード"
        :download-href="() => ''"
      />
    `
  })
}

export const Checkbox: Story = {
  render: () => ({
    components: { AnswerQuestionFields },
    setup() {
      const draft = ref<FormAnswerDraft>({})
      return { draft, question: checkboxQuestion }
    },
    template: `
      <AnswerQuestionFields
        :answer="null"
        :draft="draft"
        :question="question"
        upload-button-label="アップロード"
        :download-href="() => ''"
      />
    `
  })
}

export const FileUpload: Story = {
  render: () => ({
    components: { AnswerQuestionFields },
    setup() {
      const draft = ref<FormAnswerDraft>({})
      return { draft, question: uploadQuestion }
    },
    template: `
      <AnswerQuestionFields
        :answer="null"
        :draft="draft"
        :question="question"
        upload-button-label="アップロード"
        :download-href="() => '/v1/forms/form-1/answers/q-7/download'"
      />
    `
  })
}

export const Disabled: Story = {
  render: () => ({
    components: { AnswerQuestionFields },
    setup() {
      const draft = ref<FormAnswerDraft>({ 'text:q-1': '企画名のサンプル' })
      return { draft, question: textQuestion }
    },
    template: `
      <AnswerQuestionFields
        :answer="null"
        :draft="draft"
        :question="question"
        :disabled="true"
        upload-button-label="アップロード"
        :download-href="() => ''"
      />
    `
  })
}
