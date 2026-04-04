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

function buildFetchMock(verifyUrl = 'http://127.0.0.1:8080/email/verify/univemail/pending-123?token=token-abc') {
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
          deliveryMode: 'mock',
          message: 'モック中: メールは送信していません。認証URLを開いて登録を続けてください。',
          verifyUrl
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unexpected request: ${url}`)
  })
}

async function mountAtRegister(verifyUrl?: string) {
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

  vi.stubGlobal('fetch', buildFetchMock(verifyUrl))

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

  it('starts registration and shows the mock verify url', async () => {
    const wrapper = await mountAtRegister()

    expect(wrapper.text()).toContain('ユーザー登録')
    expect(wrapper.text()).toContain('まず大学メールアドレスを確認し、その後に登録情報を入力します')
    expect(wrapper.get('input[name="univemailLocalPart"]').exists()).toBe(true)

    await wrapper.get('input[name="univemailLocalPart"]').setValue('24z9999')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('モック中: メールは送信していません')
    const expectedVerifyUrl = new URL('/email/verify/univemail/pending-123?token=token-abc', window.location.origin)
    expect(wrapper.get(`a[href="${expectedVerifyUrl.toString()}"]`).text()).toContain('認証URLを開く')
    expect(wrapper.get('a[href="/login"]').text()).toContain('ログイン画面へ')
  })
})
