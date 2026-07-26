import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffPagesIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockPageDetail, mockScheduledStaffPage } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Notices',
  component: StaffPagesIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/pages', () =>
          HttpResponse.json([
            {
              ...mockPageDetail,
              notes: '',
              isPinned: false,
              isPublic: true,
              mailScheduled: false,
              viewableTags: [],
              documentIds: [],
              documents: []
            }
          ])
        )
      ]
    }
  }
} satisfies Meta<typeof StaffPagesIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Scheduled: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/pages', () => HttpResponse.json([mockScheduledStaffPage]))
      ]
    }
  }
}
