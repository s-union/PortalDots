import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffFormEditPage from './edit.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'
import { staffFormStoryDetail } from '../story-fixtures'

const meta = {
  title: 'Pages/Staff/Forms/Settings',
  component: StaffFormEditPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/forms/form-circle-b-1/edit'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/tags', () =>
          HttpResponse.json([
            { id: 'tag-exhibit', name: '展示', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
            { id: 'tag-indoor', name: '屋内', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
            { id: 'tag-required', name: '必須', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }
          ])
        ),
        http.get('/v1/staff/forms/{formID}', () => HttpResponse.json(staffFormStoryDetail)),
        http.put('/v1/staff/forms/{formID}', () =>
          HttpResponse.json({
            ...staffFormStoryDetail,
            questions: undefined,
            answer: undefined,
            updatedAt: '2026-03-09T10:00:00Z'
          })
        ),
        http.post('/v1/staff/forms/{formID}/copy', () =>
          HttpResponse.json({
            ...staffFormStoryDetail,
            id: 'form-circle-b-1-copy',
            questions: undefined,
            answer: undefined
          })
        ),
        http.delete('/v1/staff/forms/{formID}', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffFormEditPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ParticipationForm: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/tags', () => HttpResponse.json([])),
        http.get('/v1/staff/forms/{formID}', () =>
          HttpResponse.json({
            ...staffFormStoryDetail,
            circle: { id: 'type-1', name: '一般参加' },
            id: 'form-pt-1',
            name: '参加登録フォーム',
            answerableTags: [],
            isParticipationForm: true
          })
        )
      ]
    }
  }
}
