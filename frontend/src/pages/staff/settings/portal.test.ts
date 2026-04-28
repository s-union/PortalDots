import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
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

const defaultPortalSettings = {
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
}

describe('StaffPortalSettingsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and updates portal settings', async () => {
    let updatedRequestBody = ''

    server.use(
      http.get('/v1/staff/portal-settings', () => HttpResponse.json(defaultPortalSettings)),
      http.put('/v1/staff/portal-settings', async ({ request }) => {
        updatedRequestBody = await request.text()
        return HttpResponse.json({
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
      })
    )

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
    server.use(
      http.get('/v1/staff/portal-settings', () => HttpResponse.json(defaultPortalSettings)),
      http.put('/v1/staff/portal-settings', () =>
        HttpResponse.json(
          {
            message: 'validation_error',
            errors: {
              appName: ['ポータルの名前を入力してください']
            }
          },
          { status: 422 }
        )
      )
    )

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
