import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import UserSettingsPage from './index.vue'
import UserSettingsAppearancePage from './appearance.vue'
import UserSettingsPasswordPage from './password.vue'
import UserSettingsDeletePage from './delete.vue'

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

describe('UserSettingsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.removeItem('ui_theme')
    document.cookie = 'ui_theme=; Path=/; Max-Age=0; SameSite=Lax'
    document.documentElement.removeAttribute('data-theme')
  })

  it('updates the profile fields', async () => {
    server.use(
      http.put('/v1/session/profile', () =>
        HttpResponse.json({
          id: 'demo-user',
          displayName: 'Updated Demo User',
          studentId: 'DEMO-CIRCLE',
          univemail: 'demo-circle@portaldots.com',
          lastName: 'Updated',
          lastNameReading: 'あっぷでーと',
          firstName: 'Demo User',
          firstNameReading: 'でもゆーざー',
          contactEmail: 'updated@example.com',
          phoneNumber: '090-9999-9999'
        })
      ),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: { id: 'circle-a', name: 'デモ企画A' },
          featureFlags: [],
          roles: ['participant'],
          user: {
            id: 'demo-user',
            displayName: 'Updated Demo User',
            canDeleteAccount: false,
            studentId: 'DEMO-CIRCLE',
            univemail: 'demo-circle@portaldots.com',
            lastName: 'Updated',
            lastNameReading: 'あっぷでーと',
            firstName: 'Demo User',
            firstNameReading: 'でもゆーざー',
            contactEmail: 'updated@example.com',
            phoneNumber: '090-9999-9999'
          }
        })
      ),
      http.get('/v1/public/config', () =>
        HttpResponse.json({
          isDemo: true,
          appName: 'PortalDots',
          portalStudentIdName: '学生番号',
          portalUnivemailName: '学生用メールアドレス',
          portalUnivemailDomainPart: 'portaldots.com'
        })
      )
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: false
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/settings', component: UserSettingsPage },
        { path: '/workspace/settings/appearance', component: UserSettingsAppearancePage },
        { path: '/workspace/settings/password', component: UserSettingsPasswordPage },
        { path: '/workspace/settings/delete', component: UserSettingsDeletePage }
      ]
    })
    await router.push('/workspace/settings')
    await router.isReady()

    const wrapper = mount(UserSettingsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('input[name="name"]').setValue('Updated User')
    await wrapper.get('input[name="nameYomi"]').setValue('あっぷでーと ゆーざー')
    await wrapper.get('input[name="contactEmail"]').setValue('updated@example.com')
    await wrapper.get('input[name="phoneNumber"]').setValue('090-9999-9999')
    await wrapper.get('input[name="currentPassword"]').setValue('password')
    await wrapper.find('button[type="button"]').trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('プロフィールを更新しました。')
      expect(sessionStore.user?.displayName).toBe('Updated Demo User')
      expect(sessionStore.user?.contactEmail).toBe('updated@example.com')
    })
  })

  it('updates the password', async () => {
    server.use(http.put('/v1/session/password', () => new HttpResponse(null, { status: 204 })))

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-a', name: 'デモ企画A' },
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: false
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/settings', component: UserSettingsPage },
        { path: '/workspace/settings/appearance', component: UserSettingsAppearancePage },
        { path: '/workspace/settings/password', component: UserSettingsPasswordPage },
        { path: '/workspace/settings/delete', component: UserSettingsDeletePage }
      ]
    })
    await router.push('/workspace/settings/password')
    await router.isReady()

    const wrapper = mount(UserSettingsPasswordPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('input[name="currentPassword"]').setValue('password')
    await wrapper.get('input[name="newPassword"]').setValue('newpass123')
    await wrapper.get('input[name="confirmPassword"]').setValue('newpass123')
    await wrapper.find('button[type="button"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('パスワードを更新しました。')
  })

  it('renders links to the split settings pages', async () => {
    server.use(
      http.get('/v1/public/config', () =>
        HttpResponse.json({
          isDemo: true,
          appName: 'PortalDots',
          portalStudentIdName: '学生番号',
          portalUnivemailName: '学生用メールアドレス',
          portalUnivemailDomainPart: 'portaldots.com'
        })
      )
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: true
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/settings', component: UserSettingsPage },
        { path: '/workspace/settings/appearance', component: UserSettingsAppearancePage },
        { path: '/workspace/settings/password', component: UserSettingsPasswordPage },
        { path: '/workspace/settings/delete', component: UserSettingsDeletePage }
      ]
    })
    await router.push('/workspace/settings')
    await router.isReady()

    const wrapper = mount(UserSettingsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const tabLinks = wrapper.findAllComponents({ name: 'RouterLink' })
    expect(tabLinks.some((link) => link.props('to') === '/workspace/settings/appearance')).toBe(true)
    expect(tabLinks.some((link) => link.props('to') === '/workspace/settings/password')).toBe(true)
    expect(tabLinks.some((link) => link.props('to') === '/workspace/settings/delete')).toBe(true)
  })

  it('updates theme preference after saving and stores it in browser storage', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-a', name: 'デモ企画A' },
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: true
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/settings', component: UserSettingsPage },
        { path: '/workspace/settings/appearance', component: UserSettingsAppearancePage },
        { path: '/workspace/settings/password', component: UserSettingsPasswordPage },
        { path: '/workspace/settings/delete', component: UserSettingsDeletePage }
      ]
    })
    await router.push('/workspace/settings/appearance')
    await router.isReady()

    const wrapper = mount(UserSettingsAppearancePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('input[type="radio"][value="dark"]').setValue()
    expect(document.documentElement.dataset.theme).toBeUndefined()

    await wrapper.get('button').trigger('click')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('ui_theme')).toBe('dark')
    expect(document.cookie).toContain('ui_theme=dark')
  })

  it('renders only the appearance tab for guests', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/workspace/settings/appearance', component: UserSettingsAppearancePage },
        { path: '/workspace/settings', component: UserSettingsPage },
        { path: '/workspace/settings/password', component: UserSettingsPasswordPage },
        { path: '/workspace/settings/delete', component: UserSettingsDeletePage }
      ]
    })
    await router.push('/workspace/settings/appearance')
    await router.isReady()

    const wrapper = mount(UserSettingsAppearancePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const tabLinks = wrapper.findAllComponents({ name: 'RouterLink' })
    expect(tabLinks.some((link) => link.props('to') === '/workspace/settings/appearance')).toBe(true)
    expect(tabLinks.some((link) => link.props('to') === '/workspace/settings')).toBe(false)
    expect(tabLinks.some((link) => link.props('to') === '/workspace/settings/password')).toBe(false)
    expect(wrapper.text()).not.toContain('ワークスペースへ戻る')
  })

  it('deletes the account and redirects to home when allowed', async () => {
    let deleteWasCalled = false
    server.use(
      http.delete('/v1/session/account', () => {
        deleteWasCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: true
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/settings', component: UserSettingsPage },
        { path: '/workspace/settings/appearance', component: UserSettingsAppearancePage },
        { path: '/workspace/settings/password', component: UserSettingsPasswordPage },
        { path: '/workspace/settings/delete', component: UserSettingsDeletePage }
      ]
    })
    await router.push('/workspace/settings/delete')
    await router.isReady()

    const confirmMock = vi.spyOn(window, 'confirm').mockImplementation(() => true)

    const wrapper = mount(UserSettingsDeletePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const deleteButton = wrapper
      .findAll('button[type="button"]')
      .find((button) => button.text().includes('アカウントを削除'))
    if (!deleteButton) {
      throw new Error('delete account button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith('本当にアカウントを削除しますか？')
    expect(deleteWasCalled).toBe(true)
    expect(sessionStore.isAuthenticated).toBe(false)
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('disables delete account while a circle is selected', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-a', name: 'デモ企画A' },
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: false
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/settings', component: UserSettingsPage },
        { path: '/workspace/settings/appearance', component: UserSettingsAppearancePage },
        { path: '/workspace/settings/password', component: UserSettingsPasswordPage },
        { path: '/workspace/settings/delete', component: UserSettingsDeletePage }
      ]
    })
    await router.push('/workspace/settings/delete')
    await router.isReady()

    const wrapper = mount(UserSettingsDeletePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.find('a[href="/"]').text()).toContain('ホームに戻る')
    expect(wrapper.text()).toContain('企画に所属しているか、参加登録の途中のため、アカウント削除はできません。')
  })

  it('disables delete account when the server denies deletion', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: false
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/settings', component: UserSettingsPage },
        { path: '/workspace/settings/appearance', component: UserSettingsAppearancePage },
        { path: '/workspace/settings/password', component: UserSettingsPasswordPage },
        { path: '/workspace/settings/delete', component: UserSettingsDeletePage }
      ]
    })
    await router.push('/workspace/settings/delete')
    await router.isReady()

    const wrapper = mount(UserSettingsDeletePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.find('a[href="/"]').text()).toContain('ホームに戻る')
    expect(wrapper.text()).toContain('企画所属または権限状態のため、現在はアカウント削除できません。')
  })

  it('shows the backend validation message when account deletion fails', async () => {
    server.use(
      http.delete('/v1/session/account', () =>
        HttpResponse.json(
          {
            message: 'validation_error',
            errors: {
              user: ['企画に所属しているため、アカウント削除はできません']
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
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: true
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/settings', component: UserSettingsPage },
        { path: '/workspace/settings/appearance', component: UserSettingsAppearancePage },
        { path: '/workspace/settings/password', component: UserSettingsPasswordPage },
        { path: '/workspace/settings/delete', component: UserSettingsDeletePage }
      ]
    })
    await router.push('/workspace/settings/delete')
    await router.isReady()

    const confirmMock = vi.spyOn(window, 'confirm').mockImplementation(() => true)

    const wrapper = mount(UserSettingsDeletePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const deleteButton = wrapper
      .findAll('button[type="button"]')
      .find((button) => button.text().includes('アカウントを削除'))
    if (!deleteButton) {
      throw new Error('delete account button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith('本当にアカウントを削除しますか？')
    expect(wrapper.text()).toContain('企画に所属しているため、アカウント削除はできません')
    expect(sessionStore.isAuthenticated).toBe(true)
    expect(router.currentRoute.value.path).toBe('/workspace/settings/delete')
  })
})
