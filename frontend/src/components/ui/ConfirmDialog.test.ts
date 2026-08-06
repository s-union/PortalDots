import { defineComponent, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'
import { useConfirm } from './useConfirm'

const wrappers: VueWrapper[] = []

function mountConfirm() {
  const result = ref<boolean | null>(null)
  const Demo = defineComponent({
    setup() {
      const api = useConfirm()
      return {
        ask: () => {
          void api
            .confirm({ title: '確認', message: '続行しますか？', confirmText: 'はい', cancelText: 'いいえ' })
            .then((value) => {
              result.value = value
            })
        }
      }
    },
    template: `<button id="ask" type="button" @click="ask">確認する</button>`
  })

  const wrapper = mount(
    defineComponent({
      components: { ConfirmDialog, Demo },
      template: `<ConfirmDialog><Demo /></ConfirmDialog>`
    }),
    { attachTo: document.body }
  )
  wrappers.push(wrapper)
  return { wrapper, result }
}

function getDialog(): HTMLDialogElement {
  const dialog = document.body.querySelector('dialog')
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error('dialog element not found in document body')
  }
  return dialog
}

function findButton(label: string): HTMLButtonElement {
  const button = [...getDialog().querySelectorAll('button')].find((candidate) => candidate.textContent?.includes(label))
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`confirm button "${label}" not found`)
  }
  return button
}

afterEach(() => {
  for (const wrapper of wrappers) {
    wrapper.unmount()
  }
  wrappers.length = 0
  document.body.innerHTML = ''
})

describe('ConfirmDialog', () => {
  it('resolves true when the confirm button is clicked', async () => {
    const { wrapper, result } = mountConfirm()
    await wrapper.get('#ask').trigger('click')
    await flushPromises()

    const dialog = getDialog()
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(dialog.textContent).toContain('続行しますか？')

    findButton('はい').click()
    await flushPromises()

    expect(result.value).toBe(true)
    expect(getDialog().hasAttribute('open')).toBe(false)
  })

  it('resolves false when the cancel button is clicked', async () => {
    const { wrapper, result } = mountConfirm()
    await wrapper.get('#ask').trigger('click')
    await flushPromises()

    findButton('いいえ').click()
    await flushPromises()

    expect(result.value).toBe(false)
    expect(getDialog().hasAttribute('open')).toBe(false)
  })

  it('resolves false when closed with Escape', async () => {
    const { wrapper, result } = mountConfirm()
    await wrapper.get('#ask').trigger('click')
    await flushPromises()

    getDialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(result.value).toBe(false)
    expect(getDialog().hasAttribute('open')).toBe(false)
  })

  it('resolves false when the backdrop is clicked', async () => {
    const { wrapper, result } = mountConfirm()
    await wrapper.get('#ask').trigger('click')
    await flushPromises()

    getDialog().dispatchEvent(new MouseEvent('click', { bubbles: false }))
    await flushPromises()

    expect(result.value).toBe(false)
  })
})
