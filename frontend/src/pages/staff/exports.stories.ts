import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffExportsPage from './exports.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'Staff Mode/CSV Export',
  component: StaffExportsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff))]
    }
  }
} satisfies Meta<typeof StaffExportsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
