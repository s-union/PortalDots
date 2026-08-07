import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
// Import { within, userEvent, expect } from 'storybook/test'
import StaffTagPicker from './StaffTagPicker.vue'

const meta = {
  title: 'UI/Staff/Tags/StaffTagPicker',
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

const tagColors = {
  文化系: 'blue',
  スポーツ系: 'green',
  音楽系: 'purple',
  芸術系: 'orange',
  IT系: 'red',
  食品系: 'orange'
}

export const Empty: Story = {
  args: { modelValue: [], availableTags },
  render: () => ({
    components: { StaffTagPicker },
    setup() {
      const selectedTags = ref<string[]>([])
      return { selectedTags, availableTags, tagColors }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
        :tag-colors="tagColors"
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
      return { selectedTags, availableTags, tagColors }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
        :tag-colors="tagColors"
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
      return { selectedTags, availableTags, tagColors }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
        :tag-colors="tagColors"
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
      return { selectedTags, availableTags, tagColors }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
        :tag-colors="tagColors"
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
      return { selectedTags, availableTags, tagColors }
    },
    template: `
      <StaffTagPicker
        v-model="selectedTags"
        :available-tags="availableTags"
        :tag-colors="tagColors"
      />
    `
  }),
  play: async () => {
    // Interaction test は今回のプロジェクトでは使用しないため無効化
  }
}
