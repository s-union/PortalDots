import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormCreatePage from './create.vue'
import { mockSessionBootstrapStaff, mockTag } from '@/mocks/data'

const meta = {
  title: 'Staff Mode/Application Management/Create New',
  component: StaffFormCreatePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/staff/forms/create' },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/tags', () => HttpResponse.json([mockTag])),
        http.post('/v1/staff/forms', () =>
          HttpResponse.json({
            circle: { id: '', name: '' },
            id: 'form-new',
            name: '新規フォーム',
            description: '',
            openAt: '2026-01-01T00:00:00Z',
            closeAt: '2026-12-31T23:59:59Z',
            maxAnswers: 1,
            answerableTags: [],
            confirmationMessage: '',
            isPublic: false,
            isOpen: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            isParticipationForm: false
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffFormCreatePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
