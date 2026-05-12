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

const circlesApiMocks = vi.hoisted(() => ({
  useSelectableCirclesQuery: vi.fn(),
  useCurrentCircleDetailQuery: vi.fn()
}))

vi.mock('@/features/public-home/api', () => ({
  usePublicHomeQuery: homeApiMocks.usePublicHomeQuery,
  usePublicConfigQuery: homeApiMocks.usePublicConfigQuery
}))

vi.mock('@/features/forms/api', () => ({
  useFormsQuery: formsApiMocks.useFormsQuery
}))

vi.mock('@/features/circles/api', () => ({
  useSelectableCirclesQuery: circlesApiMocks.useSelectableCirclesQuery,
  useCurrentCircleDetailQuery: circlesApiMocks.useCurrentCircleDetailQuery
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
      { path: '/workspace/circles/detail', component: { template: '<div>circle detail</div>' } },
      { path: '/workspace/circles/confirm', component: { template: '<div>circle confirm</div>' } },
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
    const items = [
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
      }
    ]
    return {
      items,
      page: 1,
      pageSize: 20,
      total: items.length
    }
  }

  function emptyFormsPage() {
    return {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0
    }
  }

  function makeSelectableCircles() {
    return [
      {
        id: 'circle-approved',
        name: 'サイコロステーキ',
        groupName: 'フットサルサークル',
        participationTypeName: '模擬店',
        submittedAt: '2026-03-10T00:00:00Z',
        status: 'approved' as const
      },
      {
        id: 'circle-current',
        name: 'タピオカ',
        groupName: 'タピオカ同好会',
        participationTypeName: '模擬店',
        submittedAt: null,
        status: 'pending' as const
      }
    ]
  }

  function makeCurrentCircleDetail(overrides: Partial<ReturnType<typeof makeCurrentCircleDetailBase>> = {}) {
    return {
      ...makeCurrentCircleDetailBase(),
      ...overrides
    }
  }

  function makeCurrentCircleDetailBase() {
    return {
      id: 'circle-current',
      name: 'タピオカ',
      nameYomi: 'たぴおか',
      groupName: 'タピオカ同好会',
      groupNameYomi: 'たぴおかどうこうかい',
      participationTypeId: 'pt-exhibit',
      participationTypeName: '模擬店',
      formId: 'form-circle-current',
      notes: '',
      leaderDisplayName: 'Demo User',
      canChangeGroupName: true,
      isLeader: true,
      lastUpdatedAt: '2026-03-01T00:00:00Z',
      usersCountMin: 1,
      usersCountMax: 3,
      memberCount: 2,
      canSubmit: true,
      formDescription: '',
      confirmationMessage: '確認完了までしばらくお待ちください。',
      questions: [],
      answer: null,
      invitationToken: 'invite-token',
      submittedAt: null,
      status: 'pending' as const,
      formCloseAt: '2026-12-31T23:59:59Z',
      places: ['Wブース-1']
    }
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
      data: ref(emptyFormsPage()),
      isPending: ref(false)
    })
    circlesApiMocks.useSelectableCirclesQuery.mockReturnValue({
      data: ref([]),
      isPending: ref(false)
    })
    circlesApiMocks.useCurrentCircleDetailQuery.mockReturnValue({
      data: ref<ReturnType<typeof makeCurrentCircleDetail> | null>(null),
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
      data: ref(emptyFormsPage()),
      isPending: ref(false)
    })
    circlesApiMocks.useSelectableCirclesQuery.mockReturnValue({
      data: ref([]),
      isPending: ref(false)
    })
    circlesApiMocks.useCurrentCircleDetailQuery.mockReturnValue({
      data: ref<ReturnType<typeof makeCurrentCircleDetail> | null>(null),
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

  it('shows open forms panel only when the current circle is approved', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-current',
        name: 'タピオカ'
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
    circlesApiMocks.useSelectableCirclesQuery.mockReturnValue({
      data: ref(makeSelectableCircles()),
      isPending: ref(false)
    })
    circlesApiMocks.useCurrentCircleDetailQuery.mockReturnValue({
      data: ref(
        makeCurrentCircleDetail({
          submittedAt: '2026-03-10T00:00:00Z',
          status: 'approved'
        })
      ),
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
      expect(wrapper.text()).toContain('参加登録の状況')
      expect(wrapper.text()).toContain('サイコロステーキ')
      expect(wrapper.text()).toContain('「タピオカ」の参加登録は受理されました')
      expect(wrapper.text()).toContain('企画情報')
      expect(wrapper.text()).toContain('タピオカ（たぴおか）')
      expect(wrapper.text()).toContain('Wブース-1')
      expect(openFormLink?.props('to')).toBe('/workspace/forms/form-open')
      expect(findListItemLinkByText(wrapper, '「タピオカ」の参加登録は受理されました')?.props('to')).toBe(
        '/workspace/circles/detail'
      )
      expect(wrapper.text()).toContain('より詳しい情報を見る')
      expect(wrapper.get('a[href="/workspace/forms"]').text()).toContain('他の受付中の申請を見る')
      expect(wrapper.text()).not.toContain('備品申請')
    })
  })

  it('hides open forms panel while the current circle is not approved', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-current',
        name: 'タピオカ'
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
    circlesApiMocks.useSelectableCirclesQuery.mockReturnValue({
      data: ref(makeSelectableCircles()),
      isPending: ref(false)
    })
    circlesApiMocks.useCurrentCircleDetailQuery.mockReturnValue({
      data: ref(makeCurrentCircleDetail()),
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

    expect(wrapper.text()).not.toContain('受付中の申請')
    expect(wrapper.text()).toContain('ここをクリックして「タピオカ」の参加登録を提出しましょう！')
    expect(wrapper.text()).toContain(
      '学園祭係(副責任者)の招待が完了しました。ここをクリックして登録内容に不備がないかどうかを確認し、参加登録を提出しましょう。'
    )
  })
})
