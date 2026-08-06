import { defineComponent, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import Modal from './Modal.vue'

const wrappers: VueWrapper[] = []

function mountModal(options: { initialOpen?: boolean; closeOnBackdrop?: boolean } = {}) {
  const { initialOpen = false, closeOnBackdrop = true } = options
  const wrapper = mount(
    defineComponent({
      components: { Modal },
      setup() {
        const isOpen = ref(initialOpen)
        return { isOpen, closeOnBackdrop }
      },
      template: `
        <button id="trigger" type="button" @click="isOpen = true">開く</button>
        <Modal v-model:open="isOpen" title="タイトル" :close-on-backdrop="closeOnBackdrop">
          <p id="body-text">本文</p>
          <template #footer>
            <button id="cancel" type="button" @click="isOpen = false">キャンセル</button>
          </template>
        </Modal>
      `
    }),
    { attachTo: document.body }
  )
  wrappers.push(wrapper)
  return wrapper
}

function getDialog(): HTMLDialogElement {
  const dialog = document.body.querySelector('dialog')
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error('dialog element not found in document body')
  }
  return dialog
}

function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`element #${id} not found`)
  }
  return element as T
}

afterEach(() => {
  for (const wrapper of wrappers) {
    wrapper.unmount()
  }
  wrappers.length = 0
  document.body.innerHTML = ''
})

describe('Modal', () => {
  it('opens and closes with the v-model binding', async () => {
    const wrapper = mountModal()
    expect(getDialog().hasAttribute('open')).toBe(false)

    await wrapper.get('#trigger').trigger('click')
    await flushPromises()
    expect(getDialog().hasAttribute('open')).toBe(true)

    getElement<HTMLButtonElement>('cancel').click()
    await flushPromises()
    expect(getDialog().hasAttribute('open')).toBe(false)
  })

  it('closes on Escape', async () => {
    const wrapper = mountModal()
    await wrapper.get('#trigger').trigger('click')
    await flushPromises()

    getDialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(getDialog().hasAttribute('open')).toBe(false)
  })

  it('closes when the backdrop is clicked and stays open when it is not', async () => {
    const wrapper = mountModal()
    await wrapper.get('#trigger').trigger('click')
    await flushPromises()

    getElement<HTMLParagraphElement>('body-text').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(getDialog().hasAttribute('open')).toBe(true)

    getDialog().dispatchEvent(new MouseEvent('click', { bubbles: false }))
    await flushPromises()
    expect(getDialog().hasAttribute('open')).toBe(false)
  })

  it('does not close on backdrop click when closeOnBackdrop is false', async () => {
    const wrapper = mountModal({ closeOnBackdrop: false })
    await wrapper.get('#trigger').trigger('click')
    await flushPromises()

    getDialog().dispatchEvent(new MouseEvent('click', { bubbles: false }))
    await flushPromises()
    expect(getDialog().hasAttribute('open')).toBe(true)
  })

  it('moves focus into the dialog on open and restores it to the trigger on close', async () => {
    const wrapper = mountModal()
    const trigger = wrapper.get('#trigger')
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()

    expect(getDialog().contains(document.activeElement)).toBe(true)

    getDialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(document.activeElement).toBe(trigger.element)
  })

  it('locks background scroll while open and restores it on close', async () => {
    const wrapper = mountModal()
    expect(document.documentElement.style.overflow).toBe('')

    await wrapper.get('#trigger').trigger('click')
    await flushPromises()
    expect(document.documentElement.style.overflow).toBe('hidden')

    getDialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('wires aria-labelledby and aria-describedby to the header and body', async () => {
    const wrapper = mountModal()
    await wrapper.get('#trigger').trigger('click')
    await flushPromises()

    const dialog = getDialog()
    const labelledBy = dialog.getAttribute('aria-labelledby')
    const describedBy = dialog.getAttribute('aria-describedby')
    expect(labelledBy).toBeTruthy()
    expect(describedBy).toBeTruthy()

    expect(getElement(labelledBy as string).textContent).toContain('タイトル')
    expect(getElement(describedBy as string).textContent).toContain('本文')
  })
})
