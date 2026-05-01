import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffParticipationTypeEditPage from './edit.vue'
import { mockSessionBootstrapStaff, mockParticipationType, mockTag } from '@/mocks/data'

const meta = {
  title: 'スタッフモード/参加種別管理/設定',
  component: StaffParticipationTypeEditPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/circles/participation_types/type-1/edit'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/participation-types/:typeId', () => HttpResponse.json(mockParticipationType)),
        http.get('/v1/staff/tags', () => HttpResponse.json([mockTag])),
        http.put('/v1/staff/participation-types/:typeId', () => HttpResponse.json(mockParticipationType)),
        http.delete('/v1/staff/participation-types/:typeId', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof StaffParticipationTypeEditPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
