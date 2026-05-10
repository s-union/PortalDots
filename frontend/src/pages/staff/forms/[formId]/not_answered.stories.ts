import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormNotAnsweredPage from './not_answered.vue'
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

const mockAnswersIndex = {
  form: mockFormDetail,
  answers: [],
  circles: [
    {
      id: 'circle-1',
      name: 'テストサークル',
      groupName: 'テストグループ',
      participationTypeName: '一般参加'
    }
  ],
  notAnsweredCircles: [
    {
      id: 'circle-2',
      name: '未回答サークルA',
      groupName: 'グループA',
      participationTypeName: '一般参加'
    },
    {
      id: 'circle-3',
      name: '未回答サークルB',
      groupName: 'グループB',
      participationTypeName: '一般参加'
    }
  ]
}

const meta = {
  title: 'Pages/Staff/Forms/Not Answered List',
  component: StaffFormNotAnsweredPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/staff/forms/form-1/not_answered' },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/:formID/answers', () => HttpResponse.json(mockAnswersIndex))
      ]
    }
  }
} satisfies Meta<typeof StaffFormNotAnsweredPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms/:formID/answers', () =>
          HttpResponse.json({
            ...mockAnswersIndex,
            notAnsweredCircles: []
          })
        )
      ]
    }
  }
}
