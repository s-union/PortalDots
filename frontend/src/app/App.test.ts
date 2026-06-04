import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'

const appApiMocks = vi.hoisted(() => ({
  useSessionBootstrapQuery: vi.fn(),
  useLogoutMutation: vi.fn(),
  usePublicConfigQuery: vi.fn()
}))

vi.mock('@/features/session/api', () => ({
  useSessionBootstrapQuery: appApiMocks.useSessionBootstrapQuery
}))

vi.mock('@/features/auth/api', () => ({
  useLogoutMutation: appApiMocks.useLogoutMutation
}))

vi.mock('@/features/public-home/api', () => ({
  usePublicConfigQuery: appApiMocks.usePublicConfigQuery
}))

import App from './App.vue'

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

describe('App', () => {
  it('shows support and privacy links in the drawer footer', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.reset()
    appApiMocks.useSessionBootstrapQuery.mockReturnValue({ isLoading: ref(false) })
    appApiMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: false, appName: 'PortalDots' })
    })
    appApiMocks.useLogoutMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: ref(false)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/support', component: { template: '<div>support</div>' } },
        { path: '/privacy_policy', component: { template: '<div>privacy</div>' } },
        { path: '/public/pages', component: { template: '<div>public pages</div>' } },
        {
          path: '/public/documents',
          component: { template: '<div>public documents</div>' }
        },
        { path: '/workspace/pages', component: { template: '<div>pages</div>' } },
        { path: '/workspace/documents', component: { template: '<div>documents</div>' } },
        { path: '/workspace/forms', component: { template: '<div>forms</div>' } },
        { path: '/workspace/contact', component: { template: '<div>contact</div>' } },
        { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
        {
          path: '/workspace/settings/appearance',
          component: { template: '<div>appearance</div>' }
        }
      ]
    })
    await router.push('/')
    await router.isReady()

    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        matches: false,
        media: '(max-width: 1000px)',
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return true
        }
      })
    })

    try {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia, router, createQueryPlugin()]
        }
      })
      await flushPromises()

      await vi.waitFor(
        () => {
          expect(wrapper.get('a[href="https://www.portaldots.com"]').text()).toContain('PortalDots')
        },
        { timeout: 5000 }
      )
      expect(wrapper.text()).toContain('PortalDots')
      expect(wrapper.text()).toContain('Powered by')
      expect(wrapper.get('a[href="/support"]').text()).toContain('推奨動作環境')
      expect(wrapper.get('a[href="/privacy_policy"]').text()).toContain('プライバシーポリシー')

      await vi.waitFor(
        () => {
          expect(wrapper.findAll('a[href="/public/pages"]').length).toBeGreaterThan(0)
        },
        { timeout: 5000 }
      )
      expect(wrapper.findAll('a[href="/public/pages"]').at(0)?.text()).toContain('お知らせ')
      expect(wrapper.findAll('a[href="/public/documents"]').at(0)?.text()).toContain('配布資料')

      await vi.waitFor(
        () => {
          expect(wrapper.findAll('a[href="/workspace/settings/appearance"]').length).toBeGreaterThan(0)
        },
        { timeout: 5000 }
      )
      expect(wrapper.findAll('a[href="/workspace/settings/appearance"]').at(0)?.text()).toContain('ユーザー設定')
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia
      })
    }
  })

  it('shows public footer links in main content on small screens', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.reset()
    appApiMocks.useSessionBootstrapQuery.mockReturnValue({ isLoading: ref(false) })
    appApiMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: false, appName: 'PortalDots' })
    })
    appApiMocks.useLogoutMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: ref(false)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/support', component: { template: '<div>support</div>' } },
        { path: '/privacy_policy', component: { template: '<div>privacy</div>' } },
        { path: '/public/pages', component: { template: '<div>public pages</div>' } },
        {
          path: '/public/documents',
          component: { template: '<div>public documents</div>' }
        },
        { path: '/workspace/pages', component: { template: '<div>pages</div>' } },
        { path: '/workspace/documents', component: { template: '<div>documents</div>' } },
        { path: '/workspace/forms', component: { template: '<div>forms</div>' } },
        { path: '/workspace/contact', component: { template: '<div>contact</div>' } },
        { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
        {
          path: '/workspace/settings/appearance',
          component: { template: '<div>appearance</div>' }
        }
      ]
    })
    await router.push('/')
    await router.isReady()

    const originalMatchMedia = window.matchMedia
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        matches: true,
        media: '(max-width: 1000px)',
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return true
        }
      })
    })

    try {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia, router, createQueryPlugin()]
        }
      })
      await flushPromises()

      await vi.waitFor(
        () => {
          expect(wrapper.get('main a[href="/support"]').text()).toContain('推奨動作環境')
        },
        { timeout: 5000 }
      )
      expect(wrapper.get('main a[href="/privacy_policy"]').text()).toContain('プライバシーポリシー')

      await vi.waitFor(
        () => {
          expect(wrapper.findAll('a[href="/public/pages"]').length).toBeGreaterThan(0)
        },
        { timeout: 5000 }
      )
      expect(wrapper.get('a[href="/public/pages"]').text()).toContain('お知らせ')
      expect(wrapper.findAllComponents({ name: 'BottomTabLink' }).length).toBe(3)
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth
      })
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia
      })
    }
  })

  it('shows five bottom tabs for authenticated users', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-1', name: '企画A' },
      featureFlags: [],
      roles: [],
      user: { id: 'user-1', displayName: 'Demo User', canDeleteAccount: false }
    })
    appApiMocks.useSessionBootstrapQuery.mockReturnValue({ isLoading: ref(false) })
    appApiMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: false, appName: 'PortalDots' })
    })
    appApiMocks.useLogoutMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: ref(false)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/support', component: { template: '<div>support</div>' } },
        { path: '/privacy_policy', component: { template: '<div>privacy</div>' } },
        { path: '/public/pages', component: { template: '<div>public pages</div>' } },
        {
          path: '/public/documents',
          component: { template: '<div>public documents</div>' }
        },
        { path: '/workspace/contact', component: { template: '<div>contact</div>' } },
        { path: '/workspace/forms', component: { template: '<div>forms</div>' } },
        { path: '/workspace/documents', component: { template: '<div>documents</div>' } },
        { path: '/workspace/pages', component: { template: '<div>pages</div>' } },
        { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
        {
          path: '/workspace/settings/appearance',
          component: { template: '<div>appearance</div>' }
        }
      ]
    })
    await router.push('/')
    await router.isReady()

    const originalMatchMedia = window.matchMedia
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        matches: true,
        media: '(max-width: 1000px)',
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return true
        }
      })
    })

    try {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia, router, createQueryPlugin()]
        }
      })
      await flushPromises()

      await expect.poll(() => wrapper.find('nav.fixed.inset-x-0.bottom-0').text()).toContain('申請')

      const bottomNavText = wrapper.find('nav.fixed.inset-x-0.bottom-0').text()
      expect(bottomNavText).toContain('ホーム')
      expect(bottomNavText).toContain('お知らせ')
      expect(bottomNavText).toContain('配布資料')
      expect(bottomNavText).toContain('申請')
      expect(bottomNavText).toContain('お問い合わせ')
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth
      })
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia
      })
    }
  })

  it('hides privacy policy in staff demo mode footer', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['admin'],
      permissions: [],
      user: {
        id: 'staff-user',
        displayName: 'Staff User',
        canDeleteAccount: false
      }
    })
    appApiMocks.useSessionBootstrapQuery.mockReturnValue({ isLoading: ref(false) })
    appApiMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: true, appName: 'PortalDots Demo' })
    })
    appApiMocks.useLogoutMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: ref(false)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff top</div>' } },
        { path: '/support', component: { template: '<div>support</div>' } },
        { path: '/privacy_policy', component: { template: '<div>privacy</div>' } }
      ]
    })
    await router.push('/staff')
    await router.isReady()

    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        matches: false,
        media: '(max-width: 1000px)',
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return true
        }
      })
    })

    try {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia, router, createQueryPlugin()]
        }
      })
      await flushPromises()

      expect(wrapper.find('aside a[href="/support"]').exists()).toBe(false)
      expect(wrapper.find('aside a[href="/privacy_policy"]').exists()).toBe(false)
      expect(wrapper.find('main a[href="/support"]').exists()).toBe(true)
      expect(wrapper.find('main a[href="/privacy_policy"]').exists()).toBe(false)
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia
      })
    }
  })

  it('cleans up matchMedia and keydown listeners on unmount', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.reset()
    appApiMocks.useSessionBootstrapQuery.mockReturnValue({ isLoading: ref(false) })
    appApiMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: false, appName: 'PortalDots' })
    })
    appApiMocks.useLogoutMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: ref(false)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/public/pages', component: { template: '<div>public pages</div>' } },
        {
          path: '/public/documents',
          component: { template: '<div>public documents</div>' }
        },
        {
          path: '/workspace/settings/appearance',
          component: { template: '<div>appearance</div>' }
        }
      ]
    })
    await router.push('/')
    await router.isReady()

    const matchMediaAddListener = vi.fn()
    const matchMediaRemoveListener = vi.fn()
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        matches: false,
        media: '(max-width: 1000px)',
        onchange: null,
        addEventListener: matchMediaAddListener,
        removeEventListener: matchMediaRemoveListener,
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return true
        }
      })
    })

    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    try {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia, router, createQueryPlugin()]
        }
      })
      await flushPromises()

      const mediaQueryChangeHandler = matchMediaAddListener.mock.calls[0]?.[1]
      const keydownHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1]

      expect(mediaQueryChangeHandler).toBeTypeOf('function')
      expect(keydownHandler).toBeTypeOf('function')

      wrapper.unmount()

      expect(matchMediaRemoveListener).toHaveBeenCalledWith('change', mediaQueryChangeHandler)
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', keydownHandler)
    } finally {
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia
      })
    }
  })
})
