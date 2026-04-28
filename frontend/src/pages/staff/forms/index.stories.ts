import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormsIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockForm } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Forms/Index',
  component: StaffFormsIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/forms', () =>
          HttpResponse.json({
            items: [
              {
                circle: { id: '', name: '' },
                ...mockForm,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
                isParticipationForm: false
              }
            ],
            page: 1,
            pageSize: 20,
            total: 1
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffFormsIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
