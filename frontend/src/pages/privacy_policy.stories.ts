import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import PrivacyPolicyPage from './privacy_policy.vue'
import { mockPublicConfig } from '@/mocks/data'

const meta = {
  title: 'Pages/Common/Privacy Policy',
  component: PrivacyPolicyPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig))]
    }
  }
} satisfies Meta<typeof PrivacyPolicyPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
