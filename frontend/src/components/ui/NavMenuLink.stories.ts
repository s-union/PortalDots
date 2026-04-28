import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NavMenuLink from './NavMenuLink.vue'

const meta = {
  title: 'UI/NavMenuLink',
  component: NavMenuLink,
  tags: ['autodocs'],
  argTypes: {
    to: { control: 'text' },
    label: { control: 'text' },
    iconClass: { control: 'text' },
    active: { control: 'boolean' },
    adminOnly: { control: 'boolean' }
  }
} satisfies Meta<typeof NavMenuLink>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    to: '/',
    label: 'ホーム',
    iconClass: 'fas fa-home',
    active: false,
    adminOnly: false
  }
}

export const Active: Story = {
  args: {
    to: '/',
    label: 'ホーム',
    iconClass: 'fas fa-home',
    active: true,
    adminOnly: false
  }
}

export const AdminOnly: Story = {
  args: {
    to: '/staff/permissions',
    label: '権限管理',
    iconClass: 'fas fa-shield-alt',
    active: false,
    adminOnly: true
  }
}

export const ActiveAdminOnly: Story = {
  args: {
    to: '/staff/permissions',
    label: '権限管理',
    iconClass: 'fas fa-shield-alt',
    active: true,
    adminOnly: true
  }
}

export const WithoutIcon: Story = {
  args: {
    to: '/workspace',
    label: 'ワークスペース',
    active: false
  }
}
