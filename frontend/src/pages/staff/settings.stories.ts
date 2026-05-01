import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffSettingsPage from './settings.vue'
import { mockSessionBootstrapStaff } from '@/mocks/data'

const meta = {
  title: 'スタッフモード/全体設定',
  component: StaffSettingsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff))]
    }
  }
} satisfies Meta<typeof StaffSettingsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
