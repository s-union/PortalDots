import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { within, userEvent, expect } from 'storybook/test'
import PaginationFooter from './PaginationFooter.vue'

const meta = {
  title: 'UI/PaginationFooter',
  component: PaginationFooter,
  tags: ['autodocs'],
  argTypes: {
    page: { control: 'number' },
    pageSize: { control: 'number' },
    total: { control: 'number' },
    bordered: { control: 'boolean' }
  }
} satisfies Meta<typeof PaginationFooter>

export default meta
type Story = StoryObj<typeof meta>

export const FirstPage: Story = {
  args: {
    page: 1,
    pageSize: 20,
    total: 100,
    bordered: true
  }
}

export const MiddlePage: Story = {
  args: {
    page: 3,
    pageSize: 20,
    total: 100,
    bordered: true
  }
}

export const LastPage: Story = {
  args: {
    page: 5,
    pageSize: 20,
    total: 100,
    bordered: true
  }
}

export const Empty: Story = {
  args: {
    page: 1,
    pageSize: 20,
    total: 0,
    bordered: true
  }
}

export const Unbounded: Story = {
  args: {
    page: 1,
    pageSize: 20,
    total: 50,
    bordered: false
  }
}

export const Interactive: Story = {
  args: { page: 1, pageSize: 20, total: 100 },
  render: () => ({
    components: { PaginationFooter },
    setup() {
      const page = ref(1)
      return { page }
    },
    template: `
      <PaginationFooter
        :page="page"
        :page-size="20"
        :total="100"
        @update:page="page = $event"
      />
    `
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const nextButton = canvas.getByText('次へ')
    await userEvent.click(nextButton)
    await expect(canvas.getByText('2 / 5')).toBeInTheDocument()
  }
}
