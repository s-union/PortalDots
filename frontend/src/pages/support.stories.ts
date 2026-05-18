import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import SupportPage from './support.vue'
import { mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Pages/Common/Support',
  component: SupportPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig))]
    }
  }
} satisfies Meta<typeof SupportPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
