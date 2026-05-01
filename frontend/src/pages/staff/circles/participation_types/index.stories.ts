import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffParticipationTypesIndexPage from './index.vue'
import { mockSessionBootstrapStaff, mockParticipationType, mockTag } from '@/mocks/data'

const meta = {
  title: 'スタッフモード/参加種別管理',
  component: StaffParticipationTypesIndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/participation-types', () => HttpResponse.json([mockParticipationType])),
        http.get('/v1/staff/tags', () => HttpResponse.json([mockTag])),
        http.post('/v1/staff/participation-types', () => HttpResponse.json(mockParticipationType))
      ]
    }
  }
} satisfies Meta<typeof StaffParticipationTypesIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/participation-types', () => HttpResponse.json([])),
        http.get('/v1/staff/tags', () => HttpResponse.json([mockTag])),
        http.post('/v1/staff/participation-types', () => HttpResponse.json(mockParticipationType))
      ]
    }
  }
}
