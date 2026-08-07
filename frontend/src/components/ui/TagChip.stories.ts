import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TagChip from './TagChip.vue'

const meta = {
  title: 'UI/Tags/TagChip',
  component: TagChip,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['gray', 'red', 'orange', 'green', 'blue', 'purple']
    },
    size: {
      control: 'select',
      options: ['sm', 'md']
    }
  }
} satisfies Meta<typeof TagChip>

export default meta
type Story = StoryObj<typeof meta>

const paletteColours = ['gray', 'red', 'orange', 'green', 'blue', 'purple']

export const AllColours: Story = {
  args: { name: 'culture' },
  render: (args) => ({
    components: { TagChip },
    setup() {
      return { args, paletteColours }
    },
    template: `
      <div class="flex flex-wrap gap-2">
        <TagChip v-for="color in paletteColours" :key="color" :name="args.name" :color="color" />
      </div>
    `
  })
}

export const Sizes: Story = {
  args: { name: '文化系', color: 'blue' },
  render: (args) => ({
    components: { TagChip },
    setup() {
      return { args }
    },
    template: `
      <div class="flex flex-wrap items-center gap-2">
        <TagChip v-bind="args" size="sm" />
        <TagChip v-bind="args" size="md" />
      </div>
    `
  })
}

export const FallbackToGray: Story = {
  args: { name: '未分類' },
  render: (args) => ({
    components: { TagChip },
    setup() {
      return { args }
    },
    template: `
      <div class="flex flex-wrap gap-2">
        <TagChip v-bind="args" />
        <TagChip v-bind="args" color="unknown" />
      </div>
    `
  })
}
