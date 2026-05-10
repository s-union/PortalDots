import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormAnswerEditPage from './edit.vue'
import { mockSessionBootstrapStaff, mockForm } from '@/mocks/data'

const mockFormDetail = {
  ...mockForm,
  circle: { id: '', name: '' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  isParticipationForm: false,
  questions: [
    {
      id: 'q-1',
      name: '氏名',
      description: '参加する人の氏名を入力してください。',
      type: 'text' as const,
      isRequired: true,
      numberMin: null,
      numberMax: null,
      allowedTypes: '',
      options: [],
      priority: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'q-2',
      name: '意気込み',
      description: '',
      type: 'textarea' as const,
      isRequired: false,
      numberMin: null,
      numberMax: null,
      allowedTypes: '',
      options: [],
      priority: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ],
  answer: null
}

const mockCircle = {
  id: 'circle-1',
  name: 'テストサークル',
  groupName: 'テストグループ',
  participationTypeName: '一般参加'
}

const mockAnswerDetail = {
  form: mockFormDetail,
  circle: mockCircle,
  answer: {
    id: 'answer-1',
    body: 'これはテスト回答です。',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T12:00:00Z',
    details: {},
    uploads: []
  },
  siblingAnswers: [
    {
      id: 'answer-2',
      circle: mockCircle,
      body: '以前の回答',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-01-10T11:00:00Z',
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
    route: { path: '/staff/forms/form-1/answers/answer-1/edit' },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/:formID/answers/:answerID/edit', () => HttpResponse.json(mockAnswerDetail)),
        http.put('/v1/staff/forms/:formID/answers/:answerID', () => HttpResponse.json(mockAnswerDetail.answer)),
        http.delete('/v1/staff/forms/:formID/answers/:answerID', () => new HttpResponse(null, { status: 204 })),
        http.post('/v1/staff/forms/:formID/answers/:answerID/uploads', () =>
          HttpResponse.json({
            id: 'upload-1',
            questionId: 'q-1',
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            createdAt: '2026-01-15T12:00:00Z'
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffFormAnswerEditPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoSiblings: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/:formID/answers/:answerID/edit', () =>
          HttpResponse.json({ ...mockAnswerDetail, siblingAnswers: [] })
        ),
        http.put('/v1/staff/forms/:formID/answers/:answerID', () => HttpResponse.json(mockAnswerDetail.answer)),
        http.delete('/v1/staff/forms/:formID/answers/:answerID', () => new HttpResponse(null, { status: 204 })),
        http.post('/v1/staff/forms/:formID/answers/:answerID/uploads', () =>
          HttpResponse.json({
            id: 'upload-1',
            questionId: 'q-1',
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            createdAt: '2026-01-15T12:00:00Z'
          })
        )
      ]
    }
  }
}
