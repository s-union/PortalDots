import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffParticipationTypeFormEditPage from './edit.vue'
import { mockSessionBootstrapStaff, mockParticipationType } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/Participation Types/Form Settings',
  component: StaffParticipationTypeFormEditPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/staff/circles/participation_types/type-1/form/edit'
    },
    session: {
      bootstrap: mockSessionBootstrapStaff
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/participation-types/:typeId', () => HttpResponse.json(mockParticipationType)),
        http.put('/v1/staff/participation-types/:typeId', () => HttpResponse.json(mockParticipationType))
      ]
    }
  }
} satisfies Meta<typeof StaffParticipationTypeFormEditPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
