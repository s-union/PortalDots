import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('falls back to the body text as the accessible name when there is no header', async () => {
    const wrapper = mount(
      defineComponent({
        components: { Modal },
        setup: () => ({ isOpen: ref(true) }),
        template: `<Modal v-model:open="isOpen"><p>操作内容を確認してください</p></Modal>`
      }),
      { attachTo: document.body }
    )
    wrappers.push(wrapper)
    await flushPromises()

    const dialog = getDialog()
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(getElement(labelledBy as string).textContent).toContain('操作内容を確認してください')
    expect(dialog.getAttribute('aria-label')).toBeNull()
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
  })

  it('uses aria-label as the accessible name when provided and there is no header', async () => {
    const wrapper = mount(
      defineComponent({
        components: { Modal },
        setup: () => ({ isOpen: ref(true) }),
        template: `<Modal v-model:open="isOpen" aria-label="警告の確認"><p>本文</p></Modal>`
      }),
      { attachTo: document.body }
    )
    wrappers.push(wrapper)
    await flushPromises()

    const dialog = getDialog()
    expect(dialog.getAttribute('aria-label')).toBe('警告の確認')
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('scrolls only the body region and keeps the header and footer fixed', async () => {
    const wrapper = mountModal()
    await wrapper.get('#trigger').trigger('click')
    await flushPromises()

    const dialog = getDialog()
    const header = dialog.querySelector('header')
    const footer = dialog.querySelector('footer')
    const body = getElement('body-text').parentElement

    expect(header).not.toBeNull()
    expect(footer).not.toBeNull()
    expect(body).not.toBeNull()
    expect(dialog.className).toContain('flex-col')
    expect(dialog.className).toContain('max-h-')
    expect(header?.className).toContain('shrink-0')
    expect(footer?.className).toContain('shrink-0')
    expect(body?.className).toContain('min-h-0')
    expect(body?.className).toContain('overflow-y-auto')
    expect(body?.className).toContain('overscroll-contain')
  })

  it('does not show the dialog or lock the scroll when toggled open and closed in the same tick', async () => {
    const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
    const isOpen = ref(false)
    const wrapper = mount(
      defineComponent({
        components: { Modal },
        setup: () => ({ isOpen }),
        template: `<Modal v-model:open="isOpen" title="タイトル"><p>本文</p></Modal>`
      }),
      { attachTo: document.body }
    )
    wrappers.push(wrapper)

    isOpen.value = true
    isOpen.value = false
    await flushPromises()

    expect(showModalSpy).not.toHaveBeenCalled()
    expect(getDialog().hasAttribute('open')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
    showModalSpy.mockRestore()
  })

  it('does not leak the scroll lock when unmounted while the open flush is pending', async () => {
    const isOpen = ref(false)
    const wrapper = mount(
      defineComponent({
        components: { Modal },
        setup: () => ({ isOpen }),
        template: `<Modal v-model:open="isOpen" title="タイトル"><p>本文</p></Modal>`
      }),
      { attachTo: document.body }
    )
    wrappers.push(wrapper)

    isOpen.value = true
    await nextTick()
    wrapper.unmount()
    await flushPromises()

    expect(document.documentElement.style.overflow).toBe('')
  })

  it('restores focus to the previously focused element when unmounted while open', async () => {
    const externalTrigger = document.createElement('button')
    externalTrigger.textContent = '外部トリガー'
    document.body.appendChild(externalTrigger)
    externalTrigger.focus()

    const wrapper = mount(
      defineComponent({
        components: { Modal },
        setup() {
          const isOpen = ref(true)
          return { isOpen }
        },
        template: `<Modal v-model:open="isOpen" title="タイトル"><p>本文</p></Modal>`
      }),
      { attachTo: document.body }
    )
    wrappers.push(wrapper)
    await flushPromises()
    expect(getDialog().contains(document.activeElement)).toBe(true)

    wrapper.unmount()
    await flushPromises()

    expect(document.activeElement).toBe(externalTrigger)
  })
})
