import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import PrivacyPolicyPage from './privacy_policy.vue'

describe('PrivacyPolicyPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the privacy policy content', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/privacy_policy', component: PrivacyPolicyPage }
      ]
    })
    await router.push('/privacy_policy')
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
            portalUnivemailName: '学生用メールアドレス',
            portalUnivemailDomainPart: 'portaldots.com'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      })
    )

    const wrapper = mount(PrivacyPolicyPage, {
      global: {
        plugins: [
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
    await flushPromises()

    expect(wrapper.text()).toContain('プライバシーポリシー')
    expect(wrapper.text()).toContain('第５条　Cookieについて')
    expect(wrapper.text()).toContain('Googleアナリティクス')
  })

  it('shows not-found style content in demo mode', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/privacy_policy', component: PrivacyPolicyPage }
      ]
    })
    await router.push('/privacy_policy')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await Promise.resolve()
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
      })
    )

    const wrapper = mount(PrivacyPolicyPage, {
      global: {
        plugins: [
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
    await flushPromises()

    expect(wrapper.text()).toContain('お探しのページは見つかりませんでした')
    expect(wrapper.text()).toContain('前のページに戻る')
  })
})
