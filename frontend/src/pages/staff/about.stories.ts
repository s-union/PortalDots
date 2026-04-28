import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffAboutPage from './about.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'Pages/Staff/About',
  component: StaffAboutPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff))]
    }
  }
} satisfies Meta<typeof StaffAboutPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
