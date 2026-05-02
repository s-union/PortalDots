import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import AppearancePage from './appearance.vue'
import { mockSessionBootstrap } from '@/mocks/data'

const meta = {
  title: 'General/Account Settings/Appearance',
  component: AppearancePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap))]
    }
  }
} satisfies Meta<typeof AppearancePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
