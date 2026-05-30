import type { Meta, StoryObj, VueRenderer } from '@storybook/vue3-vite'
import { ref } from 'vue'
// Import { within, userEvent, expect } from 'storybook/test'
import FormQuestionPreviewItem from './FormQuestionPreviewItem.vue'
import type { StaffFormQuestion } from '@/features/staff/forms/api'
import { toQuestionId } from '@/lib/api/schema'

const meta = {
  title: 'UI/Staff/Forms/Editor/FormQuestionPreviewItem',
  component: FormQuestionPreviewItem,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    draggable: { control: 'boolean' },
    isDragging: { control: 'boolean' },
    isDropTarget: { control: 'boolean' }
  }
} satisfies Meta<typeof FormQuestionPreviewItem>

export default meta
type Story = StoryObj<typeof meta>

const baseQuestion: StaffFormQuestion = {
  id: toQuestionId('q-1'),
  name: '企画名',
  description: '企画の正式名称を入力してください。',
  type: 'text',
  isRequired: true,
  isPermanent: false,
  numberMin: null,
  numberMax: null,
  allowedTypes: '',
  options: [],
  priority: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
}

export const TextClosed: Story = {
  args: {
    question: baseQuestion,
    edit: baseQuestion,
    isOpen: false
  }
}

export const TextOpen: Story = {
  args: {
    question: baseQuestion,
    edit: baseQuestion,
    isOpen: true
  }
}

export const Textarea: Story = {
  args: {
    question: {
      ...baseQuestion,
      type: 'textarea',
      name: '活動内容',
      description: '具体的な活動内容を記述してください。'
    },
    edit: { ...baseQuestion, type: 'textarea', name: '活動内容', description: '具体的な活動内容を記述してください。' },
    isOpen: false
  }
}

export const Markdown: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: toQuestionId('q-markdown'),
      type: 'markdown',
      name: '企画紹介文',
      description: '## 見どころ\n\n- 体験できます\n- 写真撮影できます'
    },
    edit: {
      ...baseQuestion,
      id: toQuestionId('q-markdown'),
      type: 'markdown',
      name: '企画紹介文',
      description: '## 見どころ\n\n- 体験できます\n- 写真撮影できます'
    },
    isOpen: false
  }
}

export const NumberSelect: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: toQuestionId('q-number'),
      name: '参加人数',
      type: 'number',
      numberMin: 1,
      numberMax: 8
    },
    edit: {
      ...baseQuestion,
      id: toQuestionId('q-number'),
      name: '参加人数',
      type: 'number',
      numberMin: 1,
      numberMax: 8
    },
    isOpen: false
  }
}

export const Radio: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: toQuestionId('q-radio'),
      name: '参加形態',
      type: 'radio',
      options: ['室内', '屋外', 'ハイブリッド']
    },
    edit: {
      ...baseQuestion,
      id: toQuestionId('q-radio'),
      name: '参加形態',
      type: 'radio',
      options: ['室内', '屋外', 'ハイブリッド']
    },
    isOpen: false
  }
}

export const Checkbox: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: toQuestionId('q-checkbox'),
      name: '必要な設備',
      type: 'checkbox',
      isRequired: false,
      options: ['電源', '机', '椅子', 'Wi-Fi']
    },
    edit: {
      ...baseQuestion,
      id: toQuestionId('q-checkbox'),
      name: '必要な設備',
      type: 'checkbox',
      isRequired: false,
      options: ['電源', '机', '椅子', 'Wi-Fi']
    },
    isOpen: false
  }
}

export const Heading: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: toQuestionId('q-h'),
      name: '基本情報',
      type: 'heading',
      isRequired: false,
      description: ''
    },
    edit: {
      ...baseQuestion,
      id: toQuestionId('q-h'),
      name: '基本情報',
      type: 'heading',
      isRequired: false,
      description: ''
    },
    isOpen: false
  }
}

export const Upload: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: toQuestionId('q-upload'),
      name: '活動写真',
      type: 'upload',
      isRequired: false,
      allowedTypes: 'png|jpg|jpeg'
    },
    edit: {
      ...baseQuestion,
      id: toQuestionId('q-upload'),
      name: '活動写真',
      type: 'upload',
      isRequired: false,
      allowedTypes: 'png|jpg|jpeg'
    },
    isOpen: false
  }
}

export const ToggleOpenClose: StoryObj<VueRenderer> = {
  render: () => ({
    components: { FormQuestionPreviewItem },
    setup() {
      const isOpen = ref(false)
      const q = baseQuestion
      return { isOpen, q }
    },
    template: `
      <div style="max-width: 700px;">
        <FormQuestionPreviewItem
          :question="q"
          :edit="q"
          :is-open="isOpen"
          @toggle="isOpen = !isOpen"
        />
      </div>
    `
  }),
  play: async () => {
    // Interaction test は今回のプロジェクトでは使用しないため無効化
  }
}
