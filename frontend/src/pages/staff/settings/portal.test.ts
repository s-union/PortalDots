import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffPortalSettingsPage from './portal.vue'

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

describe('StaffPortalSettingsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('loads and updates portal settings', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/settings', component: { template: '<div>settings</div>' } },
        { path: '/staff/settings/portal', component: StaffPortalSettingsPage }
      ]
    })
    await router.push('/staff/settings/portal')
    await router.isReady()

    let updatedRequestBody = ''
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/session/bootstrap') && method === 'GET') {
          return jsonResponse({
            csrfToken: 'csrf-token',
            currentCircle: { id: 'circle-b', name: 'デモ企画B' },
            featureFlags: [],
            roles: ['admin'],
            permissions: [],
            user: {
              id: 'staff-user',
              displayName: 'Staff User',
              canDeleteAccount: false
            }
          })
        }

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return jsonResponse({ allowed: true, authorized: true })
        }

        if (pathname.endsWith('/staff/portal-settings') && method === 'GET') {
          return jsonResponse({
            appName: 'PortalDots',
            portalDescription: '学園祭参加団体向けポータル',
            appUrl: 'https://portal.example.com',
            appForceHttps: true,
            portalAdminName: 'PortalDots 実行委員会',
            portalContactEmail: 'contact@example.com',
            portalUnivemailLocalPart: 'student_id',
            portalUnivemailDomainPart: 'example.ac.jp',
            portalStudentIdName: '学籍番号',
            portalUnivemailName: '大学メールアドレス',
            portalPrimaryColorH: 190,
            portalPrimaryColorS: 80,
            portalPrimaryColorL: 45
          })
        }

        if (pathname.endsWith('/staff/portal-settings') && method === 'PUT') {
          if (input instanceof Request) {
            updatedRequestBody = await input.clone().text()
          } else if (typeof init?.body === 'string') {
            updatedRequestBody = init.body
          }

          return jsonResponse({
            appName: 'PortalDots Next',
            portalDescription: '次世代の学園祭ポータル',
            appUrl: 'https://next.example.com',
            appForceHttps: false,
            portalAdminName: '次世代実行委員会',
            portalContactEmail: 'next@example.com',
            portalUnivemailLocalPart: 'student_id',
            portalUnivemailDomainPart: 'next.example.ac.jp',
            portalStudentIdName: '学生番号',
            portalUnivemailName: '学校メール',
            portalPrimaryColorH: 24,
            portalPrimaryColorS: 68,
            portalPrimaryColorL: 52
          })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffPortalSettingsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Portal 設定')
    expect(wrapper.get('input[name="appName"]').element).toHaveProperty('value', 'PortalDots')

    await wrapper.get('input[name="appName"]').setValue('PortalDots Next')
    await wrapper.get('input[name="appUrl"]').setValue('https://next.example.com')
    await wrapper.get('input[name="portalContactEmail"]').setValue('next@example.com')
    await wrapper.get('select[name="portalUnivemailLocalPart"]').setValue('student_id')
    await wrapper.get('input[name="portalPrimaryColorH"]').setValue('24')
    await wrapper.get('button[type="submit"]').trigger('submit')
    await flushPromises()

    expect(updatedRequestBody).toContain('PortalDots Next')
    expect(updatedRequestBody).toContain('next@example.com')
    expect(updatedRequestBody).toContain('student_id')
    expect(updatedRequestBody).toContain('24')
    expect(wrapper.text()).toContain('Portal 設定を保存しました。')
  })

  it('shows validation error returned from API', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/settings', component: { template: '<div>settings</div>' } },
        { path: '/staff/settings/portal', component: StaffPortalSettingsPage }
      ]
    })
    await router.push('/staff/settings/portal')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/session/bootstrap') && method === 'GET') {
          return jsonResponse({
            csrfToken: 'csrf-token',
            currentCircle: { id: 'circle-b', name: 'デモ企画B' },
            featureFlags: [],
            roles: ['admin'],
            permissions: [],
            user: {
              id: 'staff-user',
              displayName: 'Staff User',
              canDeleteAccount: false
            }
          })
        }

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return jsonResponse({ allowed: true, authorized: true })
        }

        if (pathname.endsWith('/staff/portal-settings') && method === 'GET') {
          return jsonResponse({
            appName: 'PortalDots',
            portalDescription: '学園祭参加団体向けポータル',
            appUrl: 'https://portal.example.com',
            appForceHttps: true,
            portalAdminName: 'PortalDots 実行委員会',
            portalContactEmail: 'contact@example.com',
            portalUnivemailLocalPart: 'student_id',
            portalUnivemailDomainPart: 'example.ac.jp',
            portalStudentIdName: '学籍番号',
            portalUnivemailName: '大学メールアドレス',
            portalPrimaryColorH: 190,
            portalPrimaryColorS: 80,
            portalPrimaryColorL: 45
          })
        }

        if (pathname.endsWith('/staff/portal-settings') && method === 'PUT') {
          return jsonResponse(
            {
              message: 'validation_error',
              errors: {
                appName: ['ポータルの名前を入力してください']
              }
            },
            { status: 422 }
          )
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffPortalSettingsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('input[name="appName"]').setValue('')
    await wrapper.get('button[type="submit"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('ポータルの名前を入力してください')
  })
})

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')

  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers
  })
}
