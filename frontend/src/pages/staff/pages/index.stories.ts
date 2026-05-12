import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffPagesIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockPageDetail } from '@/mocks/data'

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
          HttpResponse.json({
            items: [
              {
                ...mockPageDetail,
                notes: '',
                isPinned: false,
                isPublic: true,
                viewableTags: [],
                documentIds: [],
                documents: []
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
} satisfies Meta<typeof StaffPagesIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
