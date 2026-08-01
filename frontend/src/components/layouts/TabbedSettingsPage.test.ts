import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import TabbedSettingsPage from './TabbedSettingsPage.vue'

describe('TabbedSettingsPage', () => {
  it('renders tabs and slot content', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/workspace/settings', component: { template: '<div>settings</div>' } }]
    })
    await router.push('/workspace/settings')
    await router.isReady()

    const wrapper = mount(TabbedSettingsPage, {
      props: {
        tabs: [{ label: '一般', to: '/workspace/settings', active: true }]
      },
      slots: {
        default: '<div>設定本文</div>'
      },
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('一般')
    expect(wrapper.text()).toContain('設定本文')
    expect(wrapper.classes()).toContain('px-0')
    expect(wrapper.classes()).toContain('max-[1000px]:px-0')

    const content = wrapper.find('.px-6.max-\\[1000px\\]\\:px-4')
    expect(content.exists()).toBe(true)
    expect(content.text()).toContain('設定本文')
  })
})
