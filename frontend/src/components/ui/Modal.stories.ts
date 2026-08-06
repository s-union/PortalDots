import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BaseButton from './BaseButton.vue'
import Modal from './Modal.vue'

const meta = {
  title: 'UI/Feedback/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    closeOnBackdrop: { control: 'boolean' }
  }
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { Modal, BaseButton },
    setup() {
      const isOpen = ref(true)
      return { isOpen }
    },
    template: `
      <div>
        <BaseButton type="button" @click="isOpen = true">モーダルを開く</BaseButton>
        <Modal v-model:open="isOpen" title="操作の確認">
          <p>この操作を続行しますか？</p>
          <template #footer>
            <BaseButton variant="secondary" type="button" @click="isOpen = false">キャンセル</BaseButton>
            <BaseButton variant="primary" type="button" @click="isOpen = false">続行</BaseButton>
          </template>
        </Modal>
      </div>
    `
  })
}

export const BackdropClickDisabled: Story = {
  render: () => ({
    components: { Modal, BaseButton },
    setup() {
      const isOpen = ref(true)
      return { isOpen }
    },
    template: `
      <div>
        <BaseButton type="button" @click="isOpen = true">モーダルを開く</BaseButton>
        <Modal v-model:open="isOpen" title="操作の確認" :close-on-backdrop="false">
          <p>背景のクリックでは閉じません。ボタンまたは Esc で閉じてください。</p>
          <template #footer>
            <BaseButton variant="primary" type="button" @click="isOpen = false">閉じる</BaseButton>
          </template>
        </Modal>
      </div>
    `
  })
}

export const CustomHeader: Story = {
  render: () => ({
    components: { Modal },
    setup() {
      const isOpen = ref(true)
      return { isOpen }
    },
    template: `
      <Modal v-model:open="isOpen">
        <template #header>
          <h2 class="flex items-center gap-2 text-lg font-semibold text-primary">
            <span aria-hidden="true">＊</span> カスタムヘッダー
          </h2>
        </template>
        <p>ヘッダーはスロットで自由にカスタマイズできます。</p>
      </Modal>
    `
  })
}
