import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffActivityLogsPage from './activity-logs.vue'
import { mockSessionBootstrapStaff, mockActivityLog } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/ActivityLogs',
  component: StaffActivityLogsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/activity-logs', () =>
          HttpResponse.json({
            items: [
              mockActivityLog,
              {
                ...mockActivityLog,
                id: 'log-2',
                action: 'create',
                summary: '新しい企画を作成しました',
                createdAt: '2026-01-15T11:00:00Z'
              }
            ],
            page: 1,
            pageSize: 20,
            total: 2
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffActivityLogsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
