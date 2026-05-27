import type { Meta, StoryObj } from '@storybook/vue3-vite'
import FormAnswerPreviewPanel from './FormAnswerPreviewPanel.vue'
import type { StaffFormDetail } from '@/features/staff/forms/api'
import { toCircleId, toFormId, toQuestionId, toAnswerId, toUploadId } from '@/lib/api/schema'

const meta = {
  title: 'UI/Staff/Forms/FormAnswerPreviewPanel',
  component: FormAnswerPreviewPanel,
  tags: ['autodocs'],
  argTypes: {
    formId: { control: 'text' },
    isParticipationForm: { control: 'boolean' }
  }
} satisfies Meta<typeof FormAnswerPreviewPanel>

export default meta
type Story = StoryObj<typeof meta>

const baseQuestion = {
  id: toQuestionId('q-1'),
  name: '企画名',
  description: '',
  type: 'text' as const,
  isRequired: true,
  isPermanent: false,
  numberMin: null,
  numberMax: null,
  allowedTypes: '',
  options: [],
  priority: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
}

const formBase: StaffFormDetail = {
  circle: { id: toCircleId(''), name: '' },
  id: toFormId('form-1'),
  name: 'テスト申請フォーム',
  description: 'テスト用の申請フォームです。',
  openAt: '2026-01-01T00:00:00Z',
  closeAt: '2026-12-31T23:59:59Z',
  maxAnswers: 1,
  answerableTags: [],
  confirmationMessage: '申請が完了しました。',
  isPublic: true,
  isOpen: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  isParticipationForm: false,
  questions: [
    baseQuestion,
    { ...baseQuestion, id: toQuestionId('q-2'), name: '活動内容', type: 'textarea', isRequired: false, priority: 2 },
    { ...baseQuestion, id: toQuestionId('q-3'), name: '参加人数', type: 'number', isRequired: true, priority: 3 }
  ],
  answer: null
}

export const NoAnswer: Story = {
  args: {
    formId: 'form-1',
    form: formBase
  }
}

export const WithAnswer: Story = {
  args: {
    formId: 'form-1',
    form: {
      ...formBase,
      answer: {
        id: toAnswerId('answer-1'),
        body: '',
        updatedAt: '2026-01-15T10:00:00Z',
        details: {
          'q-1': ['テストサークル'],
          'q-2': ['文化系のサークルです。毎週水曜日に活動しています。'],
          'q-3': ['15']
        },
        uploads: []
      }
    }
  }
}

export const WithUploads: Story = {
  args: {
    formId: 'form-1',
    form: {
      ...formBase,
      questions: [
        ...formBase.questions,
        {
          ...baseQuestion,
          id: toQuestionId('q-upload'),
          name: '活動写真',
          type: 'upload' as const,
          isRequired: false,
          priority: 4,
          allowedTypes: 'png|jpg|jpeg'
        }
      ],
      answer: {
        id: toAnswerId('answer-1'),
        body: '',
        updatedAt: '2026-01-15T10:00:00Z',
        details: { 'q-1': ['テストサークル'] },
        uploads: [
          {
            id: toUploadId('upload-1'),
            questionId: toQuestionId('q-upload'),
            filename: 'activity.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 204800,
            createdAt: '2026-01-15T10:00:00Z'
          }
        ]
      }
    }
  }
}

export const ParticipationForm: Story = {
  args: {
    formId: 'form-1',
    form: formBase,
    isParticipationForm: true
  }
}
