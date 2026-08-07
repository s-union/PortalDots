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

export const LongContent: Story = {
  render: () => ({
    components: { Modal, BaseButton },
    setup() {
      const isOpen = ref(true)
      return { isOpen }
    },
    template: `
      <Modal v-model:open="isOpen" title="利用規約">
        <p>ここに長いコンテンツが入ります。モーダルの本文が画面の高さを超えると、本文領域だけがスクロールし、背景のページはスクロールしないことを確認してください。</p>
        <p>スクロールロックは複数のモーダルを重ねても、最後のモーダルが閉じるまで背景がスクロールしないことを保証します。</p>
        <p>長い本文を入れて、タイトルとフッターのボタンが常に見えていることを確認します。</p>
        <p>ヘッダーとフッターは固定されたままで、本文領域だけがスクロールすることを確認してください。</p>
        <template #footer>
          <BaseButton variant="secondary" type="button" @click="isOpen = false">キャンセル</BaseButton>
          <BaseButton variant="primary" type="button" @click="isOpen = false">同意する</BaseButton>
        </template>
      </Modal>
    `
  })
}

export const WithoutHeader: Story = {
  render: () => ({
    components: { Modal, BaseButton },
    setup() {
      const isOpen = ref(true)
      return { isOpen }
    },
    template: `
      <Modal v-model:open="isOpen" aria-label="操作の確認">
        <p>ヘッダーを省略すると、ダイアログのアクセシブルネームは本文テキストか aria-label から決まります。</p>
        <template #footer>
          <BaseButton variant="primary" type="button" @click="isOpen = false">閉じる</BaseButton>
        </template>
      </Modal>
    `
  })
}
