import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import CircleDetailPage from './detail.vue'

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

const circleDetailFixture = {
  id: 'circle-a',
  name: 'テスト企画A',
  nameYomi: 'てすときかくえー',
  groupName: 'テスト大学',
  groupNameYomi: 'てすとだいがく',
  participationTypeId: 'pt-exhibit',
  participationTypeName: '展示',
  formId: 'form-pt-exhibit',
  notes: '備考テキスト',
  leaderDisplayName: 'Demo User',
  canChangeGroupName: true,
  isLeader: true,
  lastUpdatedAt: '2026-03-20T00:00:00Z',
  usersCountMin: 1,
  usersCountMax: 4,
  memberCount: 1,
  canSubmit: true,
  formDescription: '登録フォーム説明',
  confirmationMessage: '確認してください',
  questions: [],
  answer: null,
  invitationToken: 'token-abc',
  submittedAt: null
}

function buildFetchMock(
  overrides: {
    detail?: object
    updateShouldSucceed?: boolean
    deleteShouldSucceed?: boolean
  } = {}
) {
  const { updateShouldSucceed = true, deleteShouldSucceed = true } = overrides
  const detail = overrides.detail ?? circleDetailFixture

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    await Promise.resolve()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const pathname = new URL(url, 'http://localhost').pathname

    if (pathname.endsWith('/circles/current/detail') && method === 'GET') {
      return new Response(JSON.stringify(detail), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (pathname.endsWith('/circles/current/detail') && method === 'PUT') {
      if (!updateShouldSucceed) {
        return new Response(JSON.stringify({ message: 'Validation failed', errors: { name: ['保存失敗'] } }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ ...detail, name: '更新後企画A' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (pathname.endsWith('/circles/current') && method === 'DELETE') {
      if (!deleteShouldSucceed) {
        return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 })
      }
      return new Response(null, { status: 204 })
    }

    if (pathname.endsWith('/session/bootstrap') && method === 'GET') {
      return new Response(
        JSON.stringify({
          csrfToken: 'csrf-token',
          currentCircle: null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unexpected request: ${method} ${url}`)
  })
}

describe('CircleDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function setupTest() {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-a', name: 'テスト企画A' },
      featureFlags: [],
      roles: ['participant'],
      user: { id: 'demo-user', displayName: 'Demo User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/circles/detail', component: CircleDetailPage },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } },
        { path: '/workspace/circles/confirm', component: { template: '<div>confirm</div>' } }
      ]
    })

    return { pinia, router }
  }

  it('renders circle detail data', async () => {
    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

    vi.stubGlobal('fetch', buildFetchMock())

    const wrapper = mount(CircleDetailPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('展示')
    expect(wrapper.text()).toContain('未提出')
    expect(wrapper.get('input[name="name"]').element.value).toBe('テスト企画A')
    expect(wrapper.get('input[name="nameYomi"]').element.value).toBe('てすときかくえー')
    expect(wrapper.get('input[name="groupName"]').element.value).toBe('テスト大学')
    expect(wrapper.get('input[name="groupNameYomi"]').element.value).toBe('てすとだいがく')
    expect(wrapper.text()).not.toContain('登録フォーム説明')
  })

  it('shows submitted status when submittedAt is set', async () => {
    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      buildFetchMock({
        detail: { ...circleDetailFixture, submittedAt: '2026-03-10T00:00:00Z' }
      })
    )

    const wrapper = mount(CircleDetailPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('提出済み')
    expect(wrapper.text()).not.toContain('保存して確認画面へ')
  })

  it('saves circle information successfully', async () => {
    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

    vi.stubGlobal('fetch', buildFetchMock())

    const wrapper = mount(CircleDetailPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const saveButton = wrapper.findAll('button[type="button"]').find((button) => button.text() === '保存する')
    if (!saveButton) {
      throw new Error('save button not found')
    }
    await saveButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('企画参加登録の内容を保存しました')
  })

  it('shows error when save fails', async () => {
    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

    vi.stubGlobal('fetch', buildFetchMock({ updateShouldSucceed: false }))

    const wrapper = mount(CircleDetailPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const saveButton = wrapper.findAll('button[type="button"]').find((button) => button.text() === '保存する')
    if (!saveButton) {
      throw new Error('save button not found')
    }
    await saveButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('保存失敗')
  })

  it('deletes circle and navigates to home', async () => {
    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )
    vi.stubGlobal('fetch', buildFetchMock())

    const wrapper = mount(CircleDetailPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const deleteButton = wrapper.findAll('button[type="button"]').find((button) => button.text() === '企画を削除')
    if (!deleteButton) {
      throw new Error('delete button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('does not delete when user cancels confirmation', async () => {
    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

    vi.stubGlobal(
      'confirm',
      vi.fn(() => false)
    )
    vi.stubGlobal('fetch', buildFetchMock())

    const wrapper = mount(CircleDetailPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const deleteButton = wrapper.findAll('button[type="button"]').find((button) => button.text() === '企画を削除')
    if (!deleteButton) {
      throw new Error('delete button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/workspace/circles/detail')
  })
})
