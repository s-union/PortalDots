import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import CompletedPage from './completed.vue'
import { mockSessionBootstrap } from '@/mocks/data'

const meta = {
  title: 'Pages/Email/Verify/Completed',
  component: CompletedPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap))]
    }
  }
} satisfies Meta<typeof CompletedPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
