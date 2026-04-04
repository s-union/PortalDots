import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import { buildApiUrl } from '@/lib/api/client'
import { useSessionStore } from '@/features/session/store'

const homeApiMocks = vi.hoisted(() => ({
  usePublicHomeQuery: vi.fn(),
  usePublicConfigQuery: vi.fn()
}))

const formsApiMocks = vi.hoisted(() => ({
  useFormsQuery: vi.fn()
}))

vi.mock('@/features/public-home/api', () => ({
  usePublicHomeQuery: homeApiMocks.usePublicHomeQuery,
  usePublicConfigQuery: homeApiMocks.usePublicConfigQuery
}))

vi.mock('@/features/forms/api', () => ({
  useFormsQuery: formsApiMocks.useFormsQuery
}))

import HomePage from './index.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomePage },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/register', component: { template: '<div>register</div>' } },
      { path: '/circles/select', component: { template: '<div>circle select</div>' } },
      { path: '/circles/new', component: { template: '<div>circle new</div>' } },
      { path: '/public/pages', component: { template: '<div>public pages</div>' } },
      { path: '/public/pages/:pageId', component: { template: '<div>public page</div>' } },
      { path: '/public/documents', component: { template: '<div>public documents</div>' } },
      { path: '/workspace', component: { template: '<div>workspace</div>' } },
      { path: '/workspace/pages', component: { template: '<div>pages</div>' } },
      { path: '/workspace/pages/:pageId', component: { template: '<div>page</div>' } },
      { path: '/workspace/documents', component: { template: '<div>documents</div>' } },
      { path: '/workspace/forms', component: { template: '<div>forms</div>' } },
      { path: '/workspace/forms/:formId', component: { template: '<div>form</div>' } }
    ]
  })
}

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

describe('HomePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  function makePublicHomeData() {
    return {
      appName: 'PortalDots',
      portalDescription: 'PortalDots デモサイトです。',
      portalAdminName: 'PortalDots 実行委員会',
      portalContactEmail: 'support@portaldots.com',
      loginMethods: [
        {
          roleLabel: '一般ユーザー',
          loginId: 'demo-circle',
          password: 'demo-circle'
        }
      ],
      pinnedPages: [
        {
          id: 'pinned-1',
          title: 'PortalDots デモサイトへようこそ！',
          body: 'デモサイトでは PortalDots のほぼ全機能をお試し利用することができます。',
          createdAt: '2022-03-27T15:05:00Z',
          updatedAt: '2022-03-27T15:05:00Z',
          isLimited: false,
          isNew: false,
          documents: []
        }
      ],
      participationTypes: [
        {
          id: 'pt-exhibit',
          name: '展示',
          description: '展示企画の参加登録です。',
          usersCountMin: 1,
          usersCountMax: 4,
          tags: [],
          form: {
            id: 'form-pt-exhibit',
            name: '参加登録',
            description: '',
            openAt: '2026-01-01T00:00:00Z',
            closeAt: '2026-12-31T23:59:59Z',
            isPublic: true,
            isOpen: true,
            maxAnswers: 1,
            answerableTags: [],
            confirmationMessage: ''
          }
        }
      ],
      pages: [
        {
          id: 'page-1',
          title: 'お知らせサンプルです。',
          summary: 'このような形でお知らせを掲載できます。',
          createdAt: '2026-03-05T10:00:00Z',
          updatedAt: '2026-03-05T10:00:00Z',
          isLimited: false,
          isNew: true
        }
      ],
      documents: [
        {
          id: 'document-1',
          name: 'デモサイトへのログイン方法',
          description: '配布資料PDFのサンプルです。',
          isImportant: true,
          isNew: true,
          extension: 'PNG',
          sizeBytes: 97320,
          updatedAt: '2026-03-02T09:00:00Z',
          downloadUrl: '/v1/public/documents/document-1'
        }
      ]
    }
  }

  function findListItemLinkByText(wrapper: ReturnType<typeof mount>, text: string) {
    return wrapper.findAllComponents(ListItemLink).find((component) => component.text().includes(text))
  }

  function makeFormsData() {
    return [
      {
        id: 'form-open',
        name: '展示レイアウト申請',
        description: '展示レイアウトを提出してください。',
        openAt: '2026-03-01T00:00:00Z',
        closeAt: '2026-03-31T23:59:59Z',
        maxAnswers: 2,
        answerableTags: ['展示'],
        confirmationMessage: '',
        isPublic: true,
        isOpen: true,
        hasAnswer: false
      },
      {
        id: 'form-closed',
        name: '備品申請',
        description: '備品を申請してください。',
        openAt: '2026-02-01T00:00:00Z',
        closeAt: '2026-02-20T23:59:59Z',
        maxAnswers: 1,
        answerableTags: [],
        confirmationMessage: '',
        isPublic: true,
        isOpen: false,
        hasAnswer: false
      }
    ]
  }

  it('shows a login call-to-action when unauthenticated', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    homeApiMocks.usePublicHomeQuery.mockReturnValue({
      data: ref(makePublicHomeData()),
      isPending: ref(false)
    })
    homeApiMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: true, appName: 'PortalDots' })
    })
    formsApiMocks.useFormsQuery.mockReturnValue({
      data: ref([]),
      isPending: ref(false)
    })

    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })

    await flushPromises()

    await vi.waitFor(() => {
      const participationTypeLink = findListItemLinkByText(wrapper, '展示')

      expect(wrapper.text()).toContain('PortalDots')
      expect(wrapper.text()).toContain('PortalDots デモサイトへようこそ！')
      expect(wrapper.text()).toContain('ログイン方法')
      expect(wrapper.text()).toContain('demo-circle')
      expect(wrapper.text()).toContain('support@portaldots.com')
      expect(wrapper.text()).toContain('配布資料PDFのサンプルです。')
      expect(wrapper.text()).toContain('企画参加登録')
      expect(wrapper.get('a[href="/login"]').text()).toContain('ログイン')
      expect(participationTypeLink?.props('to')).toBe('/register')
      expect(wrapper.get('a[href="/public/pages"]').text()).toContain('他のお知らせを見る')
      expect(wrapper.get('a[href="/public/documents"]').text()).toContain('他の配布資料を見る')
      expect(wrapper.get(`a[href="${buildApiUrl('/v1/public/documents/document-1')}"]`).exists()).toBe(true)
    })
  })

  it('shows public home content when authenticated without login CTA', async () => {
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
        displayName: 'Demo User'
      }
    })

    homeApiMocks.usePublicHomeQuery.mockReturnValue({
      data: ref(makePublicHomeData()),
      isPending: ref(false)
    })
    homeApiMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: false, appName: 'PortalDots' })
    })
    formsApiMocks.useFormsQuery.mockReturnValue({
      data: ref([]),
      isPending: ref(false)
    })

    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await vi.waitFor(() => {
      const participationTypeLink = findListItemLinkByText(wrapper, '展示')
      const pageLink = findListItemLinkByText(wrapper, 'お知らせサンプルです。')

      expect(wrapper.text()).toContain('PortalDots デモサイトへようこそ！')
      expect(wrapper.text()).toContain('お知らせサンプルです。')
      expect(wrapper.text()).toContain('配布資料PDFのサンプルです。')
      expect(pageLink?.text()).toContain('NEW')
      expect(participationTypeLink?.props('to')).toBe('/circles/new?participation_type=pt-exhibit')
      expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
      expect(wrapper.find('a[href="/register"]').exists()).toBe(false)
      expect(wrapper.get(`a[href="${buildApiUrl('/v1/public/documents/document-1')}"]`).exists()).toBe(true)
    })
  })

  it('shows open forms panel for authenticated users with selected circle', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-1',
        name: '展示企画A'
      },
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User'
      }
    })

    homeApiMocks.usePublicHomeQuery.mockReturnValue({
      data: ref(makePublicHomeData()),
      isPending: ref(false)
    })
    homeApiMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: false, appName: 'PortalDots' })
    })
    formsApiMocks.useFormsQuery.mockReturnValue({
      data: ref(makeFormsData()),
      isPending: ref(false)
    })

    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await vi.waitFor(() => {
      const openFormLink = findListItemLinkByText(wrapper, '展示レイアウト申請')

      expect(wrapper.text()).toContain('受付中の申請')
      expect(wrapper.text()).toContain('展示レイアウト申請')
      expect(wrapper.text()).toContain('展示レイアウトを提出してください。')
      expect(openFormLink?.props('to')).toBe('/workspace/forms/form-open')
      expect(wrapper.get('a[href="/workspace/forms"]').text()).toContain('他の受付中の申請を見る')
      expect(wrapper.text()).not.toContain('備品申請')
    })
  })
})
