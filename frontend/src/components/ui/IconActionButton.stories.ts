import type { Meta, StoryObj } from '@storybook/vue3-vite'
// Import { within, userEvent, expect } from 'storybook/test'
import FaIcon from './FaIcon.vue'
import IconActionButton from './IconActionButton.vue'

const meta = {
  title: 'UI/Actions/IconActionButton',
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
    components: { FaIcon, IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><FaIcon name="edit" /></IconActionButton>`
  })
}

export const Surface: Story = {
  args: {
    variant: 'surface',
    size: 'md',
    title: '詳細'
  },
  render: (args) => ({
    components: { FaIcon, IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><FaIcon name="info-circle" /></IconActionButton>`
  })
}

export const Danger: Story = {
  args: {
    variant: 'danger',
    size: 'sm',
    title: '削除'
  },
  render: (args) => ({
    components: { FaIcon, IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><FaIcon name="trash" /></IconActionButton>`
  })
}

export const SubtleDanger: Story = {
  args: {
    variant: 'subtleDanger',
    size: 'sm',
    title: '削除'
  },
  render: (args) => ({
    components: { FaIcon, IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><FaIcon name="times" /></IconActionButton>`
  })
}

export const WithClickInteraction: Story = {
  args: {
    variant: 'ghost',
    size: 'sm',
    title: 'クリックしてください'
  },
  render: (args) => ({
    components: { FaIcon, IconActionButton },
    setup() {
      return { args }
    },
    template: `<IconActionButton v-bind="args"><FaIcon name="check" /></IconActionButton>`
  }),
  play: async () => {
    // Interaction test は今回のプロジェクトでは使用しないため無効化
  }
}
