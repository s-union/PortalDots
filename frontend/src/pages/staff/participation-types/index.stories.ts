import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffParticipationTypesRedirectPage from './index.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'Staff Mode/Participation Type Management/Redirect (List)',
  component: StaffParticipationTypesRedirectPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true }))
      ]
    }
  }
} satisfies Meta<typeof StaffParticipationTypesRedirectPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
