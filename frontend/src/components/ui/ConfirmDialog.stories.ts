import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useConfirm } from './useConfirm'

const Demo = defineComponent({
  template: `
    <div class="flex flex-wrap gap-2">
      <button type="button" @click="ask">削除の確認</button>
      <button type="button" @click="askDanger">危険な操作の確認</button>
      <p>結果: {{ result === null ? '（未実行）' : result ? 'はい' : 'いいえ' }}</p>
    </div>
  `,
  setup() {
    const api = useConfirm()
    const result = ref<boolean | null>(null)
    return {
      result,
      ask: async () => {
        result.value = await api.confirm({ title: '確認', message: '続行しますか？' })
      },
      askDanger: async () => {
        result.value = await api.confirm({
          title: '削除の確認',
          message: 'この操作は元に戻せません。削除しますか？',
          confirmText: '削除する',
          danger: true
        })
      }
    }
  }
})

const meta = {
  title: 'UI/Feedback/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs']
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { ConfirmDialog, Demo },
    template: `<ConfirmDialog><Demo /></ConfirmDialog>`
  })
}
