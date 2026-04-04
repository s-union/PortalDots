import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import PasswordResetPage from './reset.vue'

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

async function mountAtPasswordReset() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/password/reset', component: PasswordResetPage }
    ]
  })

  await router.push('/password/reset')
  await router.isReady()

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      await Promise.resolve()
      return new Response(
        JSON.stringify({
          isDemo: false,
          appName: 'PortalDots',
          portalStudentIdName: '学籍番号',
          portalUnivemailName: '大学メールアドレス',
          portalUnivemailDomainPart: 'example.ac.jp'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
  )

  return mount(PasswordResetPage, {
    global: {
      plugins: [router, createQueryPlugin()]
    }
  })
}

describe('PasswordResetPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows reset heading and request form', async () => {
    const wrapper = await mountAtPasswordReset()

    expect(wrapper.text()).toContain('パスワードの再設定')
    expect(wrapper.text()).toContain('学籍番号または連絡先メールアドレス')
    expect(wrapper.get('input[name="loginId"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('再設定のためのメールを送信')
  })
})
