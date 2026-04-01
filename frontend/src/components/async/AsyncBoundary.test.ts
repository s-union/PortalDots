import { defineAsyncComponent, defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AsyncBoundary from './AsyncBoundary.vue'

describe('AsyncBoundary', () => {
  it('renders the fallback while the default slot is suspended', async () => {
    const PendingContent = defineAsyncComponent(async () => {
      await new Promise(() => {})
      return defineComponent({
        name: 'PendingContent',
        render: () => h('div', 'resolved')
      })
    })

    const wrapper = mount(AsyncBoundary, {
      slots: {
        fallback: '<div>custom fallback</div>',
        default: () => h(PendingContent)
      }
    })

    await nextTick()

    expect(wrapper.text()).toContain('custom fallback')
  })

  it('captures child errors and retries by remounting the suspense content', async () => {
    const shouldThrow = ref(true)

    const FlakyContent = defineComponent({
      name: 'FlakyContent',
      setup() {
        if (shouldThrow.value) {
          throw new Error('boom')
        }

        return () => h('div', 'loaded after retry')
      }
    })

    const wrapper = mount(AsyncBoundary, {
      slots: {
        default: () => h(FlakyContent)
      }
    })

    await flushPromises()
    expect(wrapper.text()).toContain('boom')

    shouldThrow.value = false
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('loaded after retry')
    expect(wrapper.text()).not.toContain('boom')
  })
})
