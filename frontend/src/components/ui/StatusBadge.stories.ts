import type { Meta, StoryObj } from '@storybook/vue3-vite'
import StatusBadge from './StatusBadge.vue'

const meta = {
  title: 'UI/Feedback/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['primary', 'muted', 'danger', 'success', 'warning']
    },
    appearance: {
      control: 'select',
      options: ['filled', 'outlined']
    },
    size: {
      control: 'select',
      options: ['sm', 'md']
    }
  }
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { tone: 'primary', appearance: 'filled', size: 'md' },
  render: (args) => ({
    components: { StatusBadge },
    setup() {
      return { args }
    },
    template: `<StatusBadge v-bind="args">受付中</StatusBadge>`
  })
}

export const Muted: Story = {
  args: { tone: 'muted', appearance: 'filled', size: 'md' },
  render: (args) => ({
    components: { StatusBadge },
    setup() {
      return { args }
    },
    template: `<StatusBadge v-bind="args">全員に公開</StatusBadge>`
  })
}

export const Danger: Story = {
  args: { tone: 'danger', appearance: 'filled', size: 'md' },
  render: (args) => ({
    components: { StatusBadge },
    setup() {
      return { args }
    },
    template: `<StatusBadge v-bind="args">差し戻し</StatusBadge>`
  })
}

export const Success: Story = {
  args: { tone: 'success', appearance: 'filled', size: 'md' },
  render: (args) => ({
    components: { StatusBadge },
    setup() {
      return { args }
    },
    template: `<StatusBadge v-bind="args">受理済み</StatusBadge>`
  })
}

export const Warning: Story = {
  args: { tone: 'warning', appearance: 'filled', size: 'md' },
  render: (args) => ({
    components: { StatusBadge },
    setup() {
      return { args }
    },
    template: `<StatusBadge v-bind="args">要確認</StatusBadge>`
  })
}

export const PrimaryOutlined: Story = {
  args: { tone: 'primary', appearance: 'outlined', size: 'md' },
  render: (args) => ({
    components: { StatusBadge },
    setup() {
      return { args }
    },
    template: `<StatusBadge v-bind="args">限定公開</StatusBadge>`
  })
}

export const Small: Story = {
  args: { tone: 'danger', appearance: 'filled', size: 'sm' },
  render: (args) => ({
    components: { StatusBadge },
    setup() {
      return { args }
    },
    template: `<StatusBadge v-bind="args">NEW</StatusBadge>`
  })
}

export const AllVariants: Story = {
  render: () => ({
    components: { StatusBadge },
    template: `
      <div class="flex flex-wrap gap-2">
        <StatusBadge tone="primary">primary filled</StatusBadge>
        <StatusBadge tone="muted">muted filled</StatusBadge>
        <StatusBadge tone="danger">danger filled</StatusBadge>
        <StatusBadge tone="success">success filled</StatusBadge>
        <StatusBadge tone="warning">warning filled</StatusBadge>
        <StatusBadge tone="primary" appearance="outlined">primary outlined</StatusBadge>
        <StatusBadge tone="muted" appearance="outlined">muted outlined</StatusBadge>
        <StatusBadge tone="danger" appearance="outlined">danger outlined</StatusBadge>
        <StatusBadge tone="success" appearance="outlined">success outlined</StatusBadge>
        <StatusBadge tone="warning" appearance="outlined">warning outlined</StatusBadge>
        <StatusBadge tone="danger" size="sm">NEW (sm)</StatusBadge>
      </div>
    `
  })
}
