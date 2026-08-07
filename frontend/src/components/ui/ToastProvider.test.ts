import { defineComponent } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { DEFAULT_TOAST_DURATION, dismissToast, toasts, useToast } from './useToast'
import ToastProvider from './ToastProvider.vue'

const wrappers: VueWrapper[] = []

function mountToast() {
  const Demo = defineComponent({
    setup() {
      const api = useToast()
      return {
        success: () => api.success('保存しました'),
        info: () => api.info('お知らせがあります'),
        error: () => api.error('エラーが発生しました'),
        persistent: () => api.success('消えない通知', { duration: 0 })
      }
    },
    template: `
      <div>
        <button id="success" type="button" @click="success">成功</button>
        <button id="info" type="button" @click="info">情報</button>
        <button id="error" type="button" @click="error">エラー</button>
        <button id="persistent" type="button" @click="persistent">消えない通知</button>
      </div>
    `
  })
  const wrapper = mount(
    defineComponent({
      components: { ToastProvider, Demo },
      template: `
        <div>
          <ToastProvider />
          <Demo />
        </div>
      `
    })
  )
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  vi.useRealTimers()
  for (const wrapper of wrappers) {
    wrapper.unmount()
  }
  wrappers.length = 0
  for (const toast of toasts.value) {
    dismissToast(toast.id)
  }
  toasts.value = []
})

describe('ToastProvider', () => {
  it('shows a success toast with a polite live region', async () => {
    const wrapper = mountToast()
    await wrapper.get('#success').trigger('click')

    const toast = wrapper.get('[role="status"]')
    expect(toast.text()).toContain('保存しました')
    expect(toast.attributes('aria-live')).toBe('polite')
  })

  it('shows an info toast with a polite live region', async () => {
    const wrapper = mountToast()
    await wrapper.get('#info').trigger('click')

    const toast = wrapper.get('[role="status"]')
    expect(toast.text()).toContain('お知らせがあります')
    expect(toast.attributes('aria-live')).toBe('polite')
  })

  it('shows an error toast with an assertive live region', async () => {
    const wrapper = mountToast()
    await wrapper.get('#error').trigger('click')

    const toast = wrapper.get('[role="alert"]')
    expect(toast.text()).toContain('エラーが発生しました')
    expect(toast.attributes('aria-live')).toBe('assertive')
  })

  it('works when mounted as a sibling of the consumer', async () => {
    const wrapper = mountToast()
    await wrapper.get('#success').trigger('click')
    await wrapper.get('#info').trigger('click')
    await wrapper.get('#error').trigger('click')

    expect(wrapper.findAll('[role="status"]')).toHaveLength(2)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  })

  it('auto-dismisses after the default duration', async () => {
    vi.useFakeTimers()
    const wrapper = mountToast()
    await wrapper.get('#success').trigger('click')
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(DEFAULT_TOAST_DURATION)
    await flushPromises()

    expect(wrapper.findAll('[role="status"]')).toHaveLength(0)
  })

  it('does not auto-dismiss a toast with duration 0', async () => {
    vi.useFakeTimers()
    const wrapper = mountToast()
    await wrapper.get('#persistent').trigger('click')
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(DEFAULT_TOAST_DURATION * 2)
    await flushPromises()

    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
  })

  it('dismisses a toast via its close button', async () => {
    const wrapper = mountToast()
    await wrapper.get('#info').trigger('click')

    const toast = wrapper.get('[role="status"]')
    await toast.get('button[aria-label="通知を閉じる"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[role="status"]')).toHaveLength(0)
  })
})
