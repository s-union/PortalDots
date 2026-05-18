import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import LoginPage from './login.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/login', component: LoginPage },
      { path: '/register', component: { template: '<div>register</div>' } },
      { path: '/password/reset', component: { template: '<div>password reset</div>' } }
    ]
  })
}

describe('LoginPage', () => {
  it('renders login form fields and submit button', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [
          pinia,
          router,
          [
            VueQueryPlugin,
            {
              queryClient: new QueryClient({
                defaultOptions: {
                  queries: { retry: false }
                }
              })
            }
          ]
        ]
      }
    })

    expect(wrapper.get('input[name="loginId"]').exists()).toBe(true)
    expect(wrapper.get('input[name="password"]').exists()).toBe(true)
    expect(wrapper.get('input[name="remember"]').exists()).toBe(true)
    expect(wrapper.get('button[type="submit"]').text()).toContain('ログイン')
  })

  it('shows the API error message when authentication fails', async () => {
    server.use(
      http.post('/v1/auth/login', () =>
        HttpResponse.json(
          {
            message: 'authentication_failed',
            errors: {
              loginId: ['ログイン情報が正しくありません']
            }
          },
          { status: 422 }
        )
      )
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [
          pinia,
          router,
          [
            VueQueryPlugin,
            {
              queryClient: new QueryClient({
                defaultOptions: {
                  queries: { retry: false }
                }
              })
            }
          ]
        ]
      }
    })

    await wrapper.get('input[name="loginId"]').setValue('wrong@example.com')
    await wrapper.get('input[name="password"]').setValue('wrong')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('ログイン情報が正しくありません')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('keeps password reset helper link and example account action', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [
          pinia,
          router,
          [
            VueQueryPlugin,
            {
              queryClient: new QueryClient({
                defaultOptions: {
                  queries: { retry: false }
                }
              })
            }
          ]
        ]
      }
    })

    expect(wrapper.get('a[href="/password/reset"]').text()).toContain('パスワードをお忘れの場合はこちら')
    expect(wrapper.get('a[href="/register"]').text()).toContain('はじめての方は新規ユーザー登録')
  })
})
