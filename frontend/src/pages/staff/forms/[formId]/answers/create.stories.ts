import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffFormAnswerCreatePage from './create.vue'
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
  answers: [],
  circles: [
    mockCircle,
    {
      id: 'circle-2',
      name: '未回答サークル',
      groupName: '未回答グループ',
      participationTypeName: '一般参加'
    }
  ],
  notAnsweredCircles: [
    {
      id: 'circle-2',
      name: '未回答サークル',
      groupName: '未回答グループ',
      participationTypeName: '一般参加'
    }
  ]
}

const meta = {
  title: 'Pages/Staff/Forms/Create Answer',
  component: StaffFormAnswerCreatePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/staff/forms/form-1/answers/create' },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/{formID}/answers', () => HttpResponse.json(mockAnswersIndex)),
        http.post('/v1/staff/forms/{formID}/answers', () =>
          HttpResponse.json({
            answer: {
              id: 'answer-new',
              circle: mockCircle,
              body: '',
              createdAt: '2026-01-15T10:00:00Z',
              updatedAt: '2026-01-15T10:00:00Z',
              uploadCount: 0,
              details: {}
            }
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffFormAnswerCreatePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithExistingAnswers: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/{formID}/answers', () =>
          HttpResponse.json({
            ...mockAnswersIndex,
            answers: [
              {
                id: 'answer-1',
                circle: mockCircle,
                body: '既存の回答です。',
                createdAt: '2026-01-10T10:00:00Z',
                updatedAt: '2026-01-11T10:00:00Z',
                uploadCount: 0,
                details: {}
              }
            ]
          })
        ),
        http.post('/v1/staff/forms/{formID}/answers', () =>
          HttpResponse.json({
            answer: {
              id: 'answer-new',
              circle: mockCircle,
              body: '',
              createdAt: '2026-01-15T10:00:00Z',
              updatedAt: '2026-01-15T10:00:00Z',
              uploadCount: 0,
              details: {}
            }
          })
        )
      ]
    }
  }
}
