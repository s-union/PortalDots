import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffParticipationTypeRedirectPage from './[typeId].vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'スタッフモード/参加種別管理/転送（詳細）',
  component: StaffParticipationTypeRedirectPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/participation-types/type-1'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true }))
      ]
    }
  }
} satisfies Meta<typeof StaffParticipationTypeRedirectPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
