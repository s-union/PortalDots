import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormEditorPage from './editor.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'
import { staffFormStoryDetail, staffFormStoryQuestions } from '../story-fixtures'

const meta = {
  title: 'スタッフモード/申請管理/エディター',
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
        http.get('/v1/staff/forms/:formID', () => HttpResponse.json(staffFormStoryDetail)),
        http.put('/v1/staff/forms/:formID', () =>
          HttpResponse.json({
            ...staffFormStoryDetail,
            questions: undefined,
            answer: undefined,
            updatedAt: '2026-03-09T10:00:00Z'
          })
        ),
        http.post('/v1/staff/forms/:formID/questions', () =>
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
        http.put('/v1/staff/forms/:formID/questions/:questionID', ({ params }) =>
          HttpResponse.json({
            ...staffFormStoryQuestions.find((question) => question.id === params.questionID),
            updatedAt: '2026-03-09T10:00:00Z'
          })
        ),
        http.put('/v1/staff/forms/:formID/questions/order', () => new HttpResponse(null, { status: 204 })),
        http.delete('/v1/staff/forms/:formID/questions/:questionID', () => new HttpResponse(null, { status: 204 }))
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
        http.get('/v1/staff/forms/:formID', () => HttpResponse.json({ ...staffFormStoryDetail, questions: [] }))
      ]
    }
  }
}
