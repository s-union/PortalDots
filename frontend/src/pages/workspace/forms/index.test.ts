import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
const formsApiMocks = vi.hoisted(() => ({
  useSuspenseFormsQuery: vi.fn()
}))

vi.mock('@/features/forms/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/forms/api')>('@/features/forms/api')

  return {
    ...actual,
    useSuspenseFormsQuery: formsApiMocks.useSuspenseFormsQuery
  }
})

import FormsIndexPage from './index.vue'

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

describe('FormsIndexPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders forms for the current circle', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-b',
        name: 'デモ企画B'
      },
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/forms', component: FormsIndexPage },
        { path: '/workspace/forms/:formId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/workspace/forms')
    await router.isReady()

    formsApiMocks.useSuspenseFormsQuery.mockReturnValue({
      data: ref([
        {
          id: 'form-circle-b-1',
          name: '展示チェックフォーム',
          description: '展示レイアウトと機材使用申請を提出してください。',
          openAt: '2026-03-02T00:00:00Z',
          closeAt: '2026-03-22T23:59:59Z',
          maxAnswers: 2,
          answerableTags: ['展示'],
          confirmationMessage: '回答ありがとうございました。',
          isPublic: true,
          isOpen: true,
          hasAnswer: false
        },
        {
          id: 'form-circle-b-2',
          name: '備品返却報告',
          description: '使用した備品の返却状況を報告してください。',
          openAt: '2026-02-01T00:00:00Z',
          closeAt: '2026-02-20T23:59:59Z',
          maxAnswers: 1,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: false,
          hasAnswer: true
        }
      ]),
      suspense: vi.fn().mockResolvedValue(undefined)
    })

    const wrapper = mount(FormsIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('展示チェックフォーム')
    expect(wrapper.text()).toContain('2026年3月23日(月) 08:59 まで受付')
    expect(wrapper.text()).toContain('1企画あたり 2 件まで')
    expect(wrapper.text()).toContain('限定公開')
    expect(wrapper.text()).not.toContain('備品返却報告')
  })

  it('shows closed forms when status=closed', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-b',
        name: 'デモ企画B'
      },
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/forms', component: FormsIndexPage },
        { path: '/workspace/forms/:formId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/workspace/forms?status=closed')
    await router.isReady()

    formsApiMocks.useSuspenseFormsQuery.mockReturnValue({
      data: ref([
        {
          id: 'form-circle-b-1',
          name: '展示チェックフォーム',
          description: '展示レイアウトと機材使用申請を提出してください。',
          openAt: '2026-03-02T00:00:00Z',
          closeAt: '2026-03-22T23:59:59Z',
          maxAnswers: 2,
          answerableTags: ['展示'],
          confirmationMessage: '回答ありがとうございました。',
          isPublic: true,
          isOpen: true,
          hasAnswer: false
        },
        {
          id: 'form-circle-b-2',
          name: '備品返却報告',
          description: '使用した備品の返却状況を報告してください。',
          openAt: '2026-02-01T00:00:00Z',
          closeAt: '2026-02-20T23:59:59Z',
          maxAnswers: 1,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: false,
          hasAnswer: true
        }
      ]),
      suspense: vi.fn().mockResolvedValue(undefined)
    })

    const wrapper = mount(FormsIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('備品返却報告')
    expect(wrapper.text()).toContain('2026年2月21日(土) 08:59 で受付終了')
    expect(wrapper.text()).not.toContain('展示チェックフォーム')
  })

  it('updates query and visible forms when switching tabs', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-b',
        name: 'デモ企画B'
      },
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/forms', component: FormsIndexPage },
        { path: '/workspace/forms/:formId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/workspace/forms')
    await router.isReady()

    formsApiMocks.useSuspenseFormsQuery.mockReturnValue({
      data: ref([
        {
          id: 'form-circle-b-1',
          name: '展示チェックフォーム',
          description: '展示レイアウトと機材使用申請を提出してください。',
          openAt: '2026-03-02T00:00:00Z',
          closeAt: '2026-03-22T23:59:59Z',
          maxAnswers: 2,
          answerableTags: ['展示'],
          confirmationMessage: '回答ありがとうございました。',
          isPublic: true,
          isOpen: true,
          hasAnswer: false
        },
        {
          id: 'form-circle-b-2',
          name: '備品返却報告',
          description: '使用した備品の返却状況を報告してください。',
          openAt: '2026-02-01T00:00:00Z',
          closeAt: '2026-02-20T23:59:59Z',
          maxAnswers: 1,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: false,
          hasAnswer: true
        }
      ]),
      suspense: vi.fn().mockResolvedValue(undefined)
    })

    const wrapper = mount(FormsIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const tabs = wrapper.findAll('.border-b.border-border.bg-surface a')
    await tabs[1].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.status).toBe('closed')
    expect(wrapper.text()).toContain('備品返却報告')
    expect(wrapper.text()).not.toContain('展示チェックフォーム')

    await tabs[2].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.status).toBe('all')
    expect(wrapper.text()).toContain('備品返却報告')
    expect(wrapper.text()).toContain('展示チェックフォーム')
  })
})
