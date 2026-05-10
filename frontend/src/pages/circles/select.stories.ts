import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import SelectCirclePage from './select.vue'
import { mockSessionBootstrap, mockParticipationType } from '@/mocks/data'

const meta = {
  title: 'Pages/Circle Registration/Select Participating Circle',
  component: SelectCirclePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/circles', () =>
          HttpResponse.json([
            {
              id: 'circle-1',
              name: 'テストサークル',
              groupName: 'テストグループ',
              participationTypeName: '一般参加',
              submittedAt: null,
              status: 'pending'
            },
            {
              id: 'circle-2',
              name: 'サークルB',
              groupName: 'グループB',
              participationTypeName: '特別参加',
              submittedAt: '2026-01-10T10:00:00Z',
              status: 'approved'
            }
          ])
        ),
        http.get('/v1/participation-types', () => HttpResponse.json([mockParticipationType])),
        http.post('/v1/circles/select', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof SelectCirclePage>

export default meta
type Story = StoryObj<typeof meta>

export const WithMultipleCircles: Story = {}

export const NoCircles: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/circles', () => HttpResponse.json([])),
        http.get('/v1/participation-types', () => HttpResponse.json([mockParticipationType]))
      ]
    }
  }
}
