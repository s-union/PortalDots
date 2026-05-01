import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormAnswerUploadsPage from './uploads.vue'
import { mockSessionBootstrapStaff, mockForm } from '@/mocks/data'

const mockFormDetail = {
  ...mockForm,
  circle: { id: '', name: '' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  isParticipationForm: false,
  questions: [],
  answer: null
}

const mockCircle = {
  id: 'circle-1',
  name: 'テストサークル',
  groupName: 'テストグループ',
  participationTypeName: '一般参加'
}

const mockAnswersIndex = {
  form: mockFormDetail,
  answers: [
    {
      id: 'answer-1',
      circle: mockCircle,
      body: '',
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
      uploadCount: 3,
      details: {}
    }
  ],
  circles: [mockCircle],
  notAnsweredCircles: []
}

const meta = {
  title: 'スタッフモード/申請管理/アップロード一覧',
  component: StaffFormAnswerUploadsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/staff/forms/form-1/answers/uploads' },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/:formID/answers', () => HttpResponse.json(mockAnswersIndex))
      ]
    }
  }
} satisfies Meta<typeof StaffFormAnswerUploadsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoUploads: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/:formID/answers', () =>
          HttpResponse.json({
            ...mockAnswersIndex,
            answers: [{ ...mockAnswersIndex.answers[0], uploadCount: 0 }]
          })
        )
      ]
    }
  }
}
