import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ModeSwitchLink from './ModeSwitchLink.vue'

const meta = {
  title: 'UI/ModeSwitchLink',
  component: ModeSwitchLink,
  tags: ['autodocs'],
  argTypes: {
    to: { control: 'text' },
    label: { control: 'text' }
  }
} satisfies Meta<typeof ModeSwitchLink>

export default meta
type Story = StoryObj<typeof meta>

export const ToStaffMode: Story = {
  args: {
    to: '/staff',
    label: 'スタッフモードへ切替'
  }
}

export const ToUserMode: Story = {
  args: {
    to: '/',
    label: '一般モードへ切替'
  }
}
