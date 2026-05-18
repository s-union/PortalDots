import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PublicFooterLinks from './PublicFooterLinks.vue'

const meta = {
  title: 'UI/Navigation/PublicFooterLinks',
  component: PublicFooterLinks,
  tags: ['autodocs'],
  argTypes: {
    appName: { control: 'text' },
    showPrivacyPolicy: { control: 'boolean' }
  }
} satisfies Meta<typeof PublicFooterLinks>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    appName: 'PortalDots',
    showPrivacyPolicy: true
  }
}

export const WithoutPrivacyPolicy: Story = {
  args: {
    appName: 'PortalDots',
    showPrivacyPolicy: false
  }
}

export const WithoutAppName: Story = {
  args: {
    showPrivacyPolicy: true
  }
}
