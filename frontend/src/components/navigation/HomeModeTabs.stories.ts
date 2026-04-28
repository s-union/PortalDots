import type { Meta, StoryObj } from '@storybook/vue3-vite'
import HomeModeTabs from './HomeModeTabs.vue'

const meta = {
  title: 'UI/Navigation/HomeModeTabs',
  component: HomeModeTabs,
  tags: ['autodocs'],
  argTypes: {
    isStaffPage: { control: 'boolean' }
  }
} satisfies Meta<typeof HomeModeTabs>

export default meta
type Story = StoryObj<typeof meta>

export const UserModeActive: Story = {
  args: { isStaffPage: false }
}

export const StaffModeActive: Story = {
  args: { isStaffPage: true }
}
