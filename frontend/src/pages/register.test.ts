import { afterEach, describe, expect, it, vi } from 'vitest'
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

function buildFetchMock() {
  return vi.fn(async (input: RequestInfo | URL) => {
    await Promise.resolve()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const pathname = new URL(url, 'http://localhost').pathname

    if (pathname.endsWith('/public/config')) {
      return new Response(
        JSON.stringify({
          portalStudentIdName: '学籍番号',
          portalUnivemailName: '大学メールアドレス',
          portalUnivemailDomainPart: 'example.ac.jp'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unexpected request: ${url}`)
  })
}

async function mountAtRegister() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/register', component: RegisterPage }
    ]
  })

  await router.push('/register')
  await router.isReady()

  vi.stubGlobal('fetch', buildFetchMock())

  const wrapper = mount(RegisterPage, {
    global: {
      plugins: [pinia, router, createQueryPlugin()]
    }
  })
  await flushPromises()

  return wrapper
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows registration form and login CTA', async () => {
    const wrapper = await mountAtRegister()

    expect(wrapper.text()).toContain('ユーザー登録')
    expect(wrapper.text()).toContain('登録後はログインした状態でメール認証へ進みます')
    expect(wrapper.get('input[name="studentId"]').exists()).toBe(true)
    expect(wrapper.get('a[href="/login"]').text()).toContain('ログイン画面へ')
  })
})
