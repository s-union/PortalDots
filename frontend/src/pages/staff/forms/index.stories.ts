import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormsIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockForm } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Forms',
  component: StaffFormsIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms', () =>
          HttpResponse.json([
            {
              circle: { id: '', name: '' },
              ...mockForm,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
              isParticipationForm: false
            }
          ])
        ),
        http.post('/v1/staff/forms/:formID/copy', () =>
          HttpResponse.json({
            circle: { id: '', name: '' },
            ...mockForm,
            id: 'form-copy',
            name: `${mockForm.name} コピー`,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            isParticipationForm: false
          })
        ),
        http.delete('/v1/staff/forms/:formID', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffFormsIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms', () => HttpResponse.json([])),
        http.post('/v1/staff/forms/:formID/copy', () => HttpResponse.json(mockForm)),
        http.delete('/v1/staff/forms/:formID', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
}

export const MultipleForms: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms', () =>
          HttpResponse.json([
            {
              circle: { id: '', name: '' },
              ...mockForm,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
              isParticipationForm: false
            },
            {
              circle: { id: 'circle-1', name: 'テストサークル' },
              ...mockForm,
              id: 'form-2',
              name: '参加登録フォーム',
              isParticipationForm: true,
              isPublic: false,
              createdAt: '2026-01-02T00:00:00Z',
              updatedAt: '2026-01-05T00:00:00Z'
            }
          ])
        ),
        http.post('/v1/staff/forms/:formID/copy', () =>
          HttpResponse.json({
            circle: { id: '', name: '' },
            ...mockForm,
            id: 'form-copy',
            name: `${mockForm.name} コピー`,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            isParticipationForm: false
          })
        ),
        http.delete('/v1/staff/forms/:formID', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
}
