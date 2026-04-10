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
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    await Promise.resolve()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const pathname = new URL(url, 'http://localhost').pathname

    if (pathname.endsWith('/public/config')) {
      return new Response(
        JSON.stringify({
          isDemo: true,
          appName: 'PortalDots',
          portalStudentIdName: '学籍番号',
          portalUnivemailName: '学生用メールアドレス',
          portalUnivemailDomainPart: 'portaldots.com'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (pathname.endsWith('/auth/register/start') && method === 'POST') {
      return new Response(
        JSON.stringify({
          message: '大学メールアドレスに認証URLを送信しました。'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (pathname.endsWith('/session/bootstrap')) {
      return new Response(
        JSON.stringify({
          csrfToken: 'csrf-token',
          currentCircle: null,
          featureFlags: [],
          roles: ['participant'],
          permissions: [],
          user: {
            id: 'user-1',
            displayName: 'PortalDots Demo User'
          }
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

  return { wrapper, router }
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts registration and shows the success guidance', async () => {
    const { wrapper, router } = await mountAtRegister()

    expect(wrapper.text()).toContain('ユーザー登録')
    expect(wrapper.get('input[name="univemailLocalPart"]').exists()).toBe(true)

    await wrapper.get('input[name="univemailLocalPart"]').setValue('24z9999')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('大学メールアドレスに認証URLを送信しました。')
    expect(router.currentRoute.value.fullPath).toBe('/register')
  })
})
