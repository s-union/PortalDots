import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffCirclesIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockParticipationType } from '@/mocks/data'

const meta = {
  title: 'スタッフモード/企画管理',
  component: StaffCirclesIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/participation-types', () => HttpResponse.json([mockParticipationType]))
      ]
    }
  }
} satisfies Meta<typeof StaffCirclesIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
