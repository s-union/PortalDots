import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import RegisterPage from './register.vue'

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

async function mountAtRegister() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/register', component: RegisterPage }
    ]
  })

  await router.push('/register')
  await router.isReady()

  const wrapper = mount(RegisterPage, {
    global: {
      plugins: [pinia, router, createQueryPlugin()]
    }
  })
  await flushPromises()

  return { wrapper, router }
}

describe('RegisterPage', () => {
  it('starts registration and shows the success guidance', async () => {
    const { wrapper, router } = await mountAtRegister()

    expect(wrapper.text()).toContain('ユーザー登録')
    expect(wrapper.get('input[name="univemailLocalPart"]').exists()).toBe(true)

    await wrapper.get('input[name="univemailLocalPart"]').setValue('24z9999')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('確認メールを送信しました。')
    expect(router.currentRoute.value.fullPath).toBe('/register')
  })
})
