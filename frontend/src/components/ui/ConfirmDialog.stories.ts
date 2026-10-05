import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
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
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const dialog = await body.findByRole('dialog', { hidden: true })
    const trigger = canvas.getByRole('button', { name: '削除の確認' })
    const nextTrigger = canvas.getByRole('button', { name: '危険な操作の確認' })

    await expect(dialog.getBoundingClientRect().height).toBe(0)
    await expect(dialog).not.toBeVisible()
    trigger.focus()
    await userEvent.tab({ shift: true })
    await expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(false)
    trigger.focus()
    await userEvent.tab()
    await expect(nextTrigger).toHaveFocus()

    await userEvent.click(trigger)
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.click(body.getByRole('button', { name: 'キャンセル' }))
    await expect(dialog).not.toBeVisible()
    await expect(dialog.getBoundingClientRect().height).toBe(0)
    await expect(trigger).toHaveFocus()
    await expect(canvas.getByText('結果: いいえ')).toBeVisible()

    await userEvent.click(trigger)
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toHaveFocus()

    await userEvent.click(trigger)
    await userEvent.click(body.getByRole('button', { name: 'OK' }))
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toHaveFocus()
    await expect(canvas.getByText('結果: はい')).toBeVisible()
  }
}

export const Danger: Story = {
  render: () => ({
    components: { ConfirmDialog, Demo },
    template: `<ConfirmDialog><Demo /></ConfirmDialog>`
  })
}

export const ConsecutiveConfirmations: Story = {
  render: () => ({
    components: { ConfirmDialog },
    setup() {
      const result = ref<boolean | null>(null)
      const { confirm } = useConfirm()
      async function ask() {
        if (await confirm({ title: '最初の確認', message: '次の確認へ進みますか？' })) {
          result.value = await confirm({ title: '次の確認', message: '操作を確定しますか？' })
        }
      }
      return { result, ask }
    },
    template: `
      <ConfirmDialog />
      <button type="button" @click="ask">2回確認する</button>
      <p>結果: {{ result === null ? '（未実行）' : result ? 'はい' : 'いいえ' }}</p>
    `
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await canvas.findByRole('button', { name: '2回確認する' })
    await userEvent.click(trigger)
    const first = await body.findByRole('dialog', { name: '最初の確認' })
    await userEvent.click(within(first).getByRole('button', { name: 'OK' }))
    const second = await body.findByRole('dialog', { name: '次の確認' })
    await waitFor(() => expect(second).toBeVisible())
    await userEvent.click(within(second).getByRole('button', { name: 'OK' }))
    await expect(canvas.getByText('結果: はい')).toBeVisible()
    await expect(second).not.toBeVisible()
    await expect(trigger).toHaveFocus()
  }
}
