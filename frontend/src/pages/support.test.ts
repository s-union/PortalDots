import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import SupportPage from './support.vue'

function createQueryPlugin() {
  return [
    VueQueryPlugin,
    {
      queryClient: new QueryClient({
        defaultOptions: {
          queries: { retry: false }
        }
      })
    }
  ]
}

describe('SupportPage', () => {
  it('shows recommended browser guidance', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/support', component: SupportPage }
      ]
    })
    await router.push('/support')
    await router.isReady()

    const wrapper = mount(SupportPage, {
      global: {
        plugins: [router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('ブラウザ環境について')
    expect(wrapper.text()).toContain('Microsoft Edge 最新版')
    expect(wrapper.text()).toContain('PortalDotsは以下の環境でご覧いただくことを推奨いたします。')
  })
})
