import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useUnsavedChangesGuard, UNSAVED_CHANGES_CONFIRM_MESSAGE } from './useUnsavedChangesGuard'

function createHarness() {
  const dirty = ref(false)
  const clear = ref<() => void>(() => undefined)

  const GuardHost = defineComponent({
    setup() {
      clear.value = useUnsavedChangesGuard(dirty).clear
      return () => h('div')
    }
  })

  const App = defineComponent({
    template: '<router-view />'
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: GuardHost },
      { path: '/other', component: { template: '<div>other page</div>' } }
    ]
  })

  return { dirty, clear, App, router }
}

async function mountHarness() {
  const harness = createHarness()
  await harness.router.push('/')
  await harness.router.isReady()
  const wrapper = mount(harness.App, { global: { plugins: [harness.router] } })
  await nextTick()
  return { ...harness, wrapper }
}

function dispatchBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('useUnsavedChangesGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('arms the beforeunload listener while dirty and removes it when clean', async () => {
    const { dirty, wrapper } = await mountHarness()

    dirty.value = false
    await nextTick()
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false)

    dirty.value = true
    await nextTick()
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true)

    dirty.value = false
    await nextTick()
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false)

    wrapper.unmount()
  })

  it('removes the beforeunload listener on unmount', async () => {
    const { dirty, wrapper } = await mountHarness()

    dirty.value = true
    await nextTick()
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true)

    wrapper.unmount()
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false)
  })

  it('asks for confirmation before an in-app navigation while dirty', async () => {
    const { dirty, router } = await mountHarness()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    dirty.value = true
    await nextTick()

    await router.push('/other')
    expect(confirmSpy).toHaveBeenCalledWith(UNSAVED_CHANGES_CONFIRM_MESSAGE)
    expect(router.currentRoute.value.path).toBe('/')

    confirmSpy.mockReturnValue(true)
    await router.push('/other')
    expect(router.currentRoute.value.path).toBe('/other')
  })

  it('allows an in-app navigation without confirmation while clean', async () => {
    const { dirty, router } = await mountHarness()
    const confirmSpy = vi.spyOn(window, 'confirm')

    dirty.value = false
    await nextTick()

    await router.push('/other')
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/other')
  })

  it('stops guarding after clear() is called', async () => {
    const { dirty, clear, router } = await mountHarness()
    const confirmSpy = vi.spyOn(window, 'confirm')

    dirty.value = true
    await nextTick()
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true)

    clear.value()
    await nextTick()
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false)

    await router.push('/other')
    expect(confirmSpy).not.toHaveBeenCalled()
  })
})
