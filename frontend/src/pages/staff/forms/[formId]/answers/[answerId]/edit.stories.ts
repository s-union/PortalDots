import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffFormAnswerEditPage from './edit.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'
import { staffFormStoryQuestions } from '../../../story-fixtures'

const editFixture = {
  form: {
    id: 'form-1',
    name: '展示チェックフォーム',
    description: '展示レイアウトと機材使用申請を提出してください。',
    openAt: '2026-03-02T00:00:00Z',
    closeAt: '2026-03-22T23:59:59Z',
    maxAnswers: 2,
    answerableTags: ['展示', '屋内'],
    confirmationMessage: '回答ありがとうございました。内容を確認して必要に応じて連絡します。',
    isPublic: true,
    isOpen: true,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    isParticipationForm: false,
    questions: staffFormStoryQuestions,
    answer: null
  },
  circle: {
    id: 'circle-1',
    name: '珈琲研究会',
    groupName: '珈琲研究会',
    participationTypeName: '展示'
  },
  answer: {
    id: 'answer-1',
    body: '展示位置は正面入口側を希望します。',
    createdAt: '2026-03-06T11:20:00Z',
    updatedAt: '2026-03-08T09:30:00Z',
    details: {
      'question-responsible': ['佐藤 花子'],
      'question-equipment': ['長机', '電源'],
      'question-power': ['2'],
      'question-layout': ['layout-coffee.pdf']
    },
    uploads: [
      {
        id: 'upload-1',
        questionId: 'question-layout',
        filename: 'layout-coffee.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 153600,
        createdAt: '2026-03-06T12:00:00Z'
      }
    ]
  },
  siblingAnswers: [
    {
      id: 'answer-1',
      circle: {
        id: 'circle-1',
        name: '珈琲研究会',
        groupName: '珈琲研究会',
        participationTypeName: '展示'
      },
      body: '展示位置は正面入口側を希望します。',
      createdAt: '2026-03-06T11:20:00Z',
      updatedAt: '2026-03-08T09:30:00Z',
      uploadCount: 1,
      details: {}
    }
  ]
}

const meta = {
  title: 'Pages/Staff/Forms/Edit Answer',
  component: StaffFormAnswerEditPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/forms/form-1/answers/answer-1/edit'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/{formID}/answers/{answerID}/edit', () => HttpResponse.json(editFixture)),
        http.put('/v1/staff/forms/{formID}/answers/{answerID}', () =>
          HttpResponse.json({
            id: 'answer-1',
            body: '更新後本文',
            createdAt: '2026-03-06T11:20:00Z',
            updatedAt: '2026-03-08T10:00:00Z',
            details: {},
            uploads: []
          })
        ),
        http.post('/v1/staff/forms/{formID}/answers/{answerID}/uploads', () =>
          HttpResponse.json({
            id: 'upload-new',
            questionId: 'question-layout',
            filename: 'new-layout.png',
            mimeType: 'image/png',
            sizeBytes: 204800,
            createdAt: '2026-03-08T10:00:00Z'
          })
        ),
        http.delete('/v1/staff/forms/{formID}/answers/{answerID}', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffFormAnswerEditPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoQuestions: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/{formID}/answers/{answerID}/edit', () =>
          HttpResponse.json({
            ...editFixture,
            form: { ...editFixture.form, questions: [], answerableTags: [] },
            answer: { ...editFixture.answer, details: {}, uploads: [] },
            siblingAnswers: []
          })
        ),
        http.put('/v1/staff/forms/{formID}/answers/{answerID}', () =>
          HttpResponse.json({
            id: 'answer-1',
            body: '更新後本文',
            createdAt: '2026-03-06T11:20:00Z',
            updatedAt: '2026-03-08T10:00:00Z',
            details: {},
            uploads: []
          })
        ),
        http.delete('/v1/staff/forms/{formID}/answers/{answerID}', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
}
