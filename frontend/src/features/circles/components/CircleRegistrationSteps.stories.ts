import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CircleRegistrationSteps from './CircleRegistrationSteps.vue'

const meta = {
  title: 'UI/企画/企画登録ステップ',
  component: CircleRegistrationSteps,
  tags: ['autodocs'],
  argTypes: {
    currentStep: { control: 'number' },
    requiresMemberStep: { control: 'boolean' }
  },
  args: {
    currentStep: 1,
    requiresMemberStep: true
  }
} satisfies Meta<typeof CircleRegistrationSteps>

export default meta
type Story = StoryObj<typeof meta>

export const Detail: Story = {}

export const Members: Story = {
  args: {
    currentStep: 2,
    requiresMemberStep: true
  }
}

export const Confirm: Story = {
  args: {
    currentStep: 3,
    requiresMemberStep: true
  }
}

export const WithoutMemberStep: Story = {
  args: {
    currentStep: 3,
    requiresMemberStep: false
  }
}
