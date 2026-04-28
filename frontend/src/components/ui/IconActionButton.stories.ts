import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { within, userEvent, expect } from '@storybook/test'
import IconActionButton from './IconActionButton.vue'

const meta = {
  title: 'UI/IconActionButton',
  component: IconActionButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['ghost', 'surface', 'danger', 'subtleDanger']
    },
    size: {
      control: 'select',
      options: ['sm', 'md']
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset']
    },
    title: { control: 'text' },
    ariaLabel: { control: 'text' }
  }
} satisfies Meta<typeof IconActionButton>

export default meta
type Story = StoryObj<typeof meta>

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'sm',
    title: '編集'
  },
  render: (args) => ({
    components: { IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><i class="fas fa-edit" aria-hidden="true" /></IconActionButton>`
  })
}

export const Surface: Story = {
  args: {
    variant: 'surface',
    size: 'md',
    title: '詳細'
  },
  render: (args) => ({
    components: { IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><i class="fas fa-info-circle" aria-hidden="true" /></IconActionButton>`
  })
}

export const Danger: Story = {
  args: {
    variant: 'danger',
    size: 'sm',
    title: '削除'
  },
  render: (args) => ({
    components: { IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><i class="fas fa-trash" aria-hidden="true" /></IconActionButton>`
  })
}

export const SubtleDanger: Story = {
  args: {
    variant: 'subtleDanger',
    size: 'sm',
    title: '削除'
  },
  render: (args) => ({
    components: { IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><i class="fas fa-times" aria-hidden="true" /></IconActionButton>`
  })
}

export const WithClickInteraction: Story = {
  args: {
    variant: 'ghost',
    size: 'sm',
    title: 'クリックしてください'
  },
  render: (args) => ({
    components: { IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><i class="fas fa-check" aria-hidden="true" /></IconActionButton>`
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByTitle('クリックしてください')
    await expect(button).toBeInTheDocument()
    await userEvent.click(button)
  }
}
