import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { within, userEvent, expect } from '@storybook/test'
import StaffTagPicker from './StaffTagPicker.vue'

const meta = {
  title: 'UI/Staff/StaffTagPicker',
  component: StaffTagPicker,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    allowCustom: { control: 'boolean' },
    placeholder: { control: 'text' },
    emptyMessage: { control: 'text' }
  }
} satisfies Meta<typeof StaffTagPicker>

export default meta
type Story = StoryObj<typeof meta>

const availableTags = ['文化系', 'スポーツ系', '音楽系', '芸術系', 'IT系', '食品系']

export const Empty: Story = {
  args: { modelValue: [], availableTags },
  render: () => ({
    components: { StaffTagPicker },
    setup() {
      const selectedTags = ref<string[]>([])
      return { selectedTags, availableTags }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
        placeholder="タグ名を入力して追加"
        empty-message="タグは未選択です。"
      />
    `
  })
}

export const WithSelectedTags: Story = {
  args: { modelValue: ['文化系', 'IT系'], availableTags },
  render: () => ({
    components: { StaffTagPicker },
    setup() {
      const selectedTags = ref(['文化系', 'IT系'])
      return { selectedTags, availableTags }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
      />
    `
  })
}

export const Disabled: Story = {
  args: { modelValue: ['文化系', 'スポーツ系'], availableTags, disabled: true },
  render: () => ({
    components: { StaffTagPicker },
    setup() {
      const selectedTags = ref(['文化系', 'スポーツ系'])
      return { selectedTags, availableTags }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
        :disabled="true"
      />
    `
  })
}

export const NoCustomTags: Story = {
  args: { modelValue: [], availableTags, allowCustom: false },
  render: () => ({
    components: { StaffTagPicker },
    setup() {
      const selectedTags = ref<string[]>([])
      return { selectedTags, availableTags }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
        :allow-custom="false"
        placeholder="既存のタグから選択してください"
      />
    `
  })
}

export const WithSearch: Story = {
  args: { modelValue: [], availableTags },
  render: () => ({
    components: { StaffTagPicker },
    setup() {
      const selectedTags = ref<string[]>([])
      return { selectedTags, availableTags }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
      />
    `
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('textbox')
    await userEvent.type(input, '文化')
    await expect(canvas.getByText('文化系')).toBeInTheDocument()
  }
}
