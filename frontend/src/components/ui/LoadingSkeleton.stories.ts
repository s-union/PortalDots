import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LoadingSkeleton from './LoadingSkeleton.vue'

const meta = {
  title: 'UI/LoadingSkeleton',
  component: LoadingSkeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'list', 'detail']
    }
  }
} satisfies Meta<typeof LoadingSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { variant: 'default' }
}

export const List: Story = {
  args: { variant: 'list' }
}

export const Detail: Story = {
  args: { variant: 'detail' }
}
