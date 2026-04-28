import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
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

describe('CircleDetailPage', () => {
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
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.put('/v1/circles/current/detail', () => HttpResponse.json({ ...circleDetailFixture, name: '更新後企画A' })),
      http.delete('/v1/circles/current', () => new HttpResponse(null, { status: 204 })),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

    const wrapper = mount(CircleDetailPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('展示')
    expect(wrapper.text()).toContain('未提出')
    expect(wrapper.get('input[name="leaderDisplayName"]').element.value).toBe('Demo User')
    expect(wrapper.get('input[name="name"]').element.value).toBe('テスト企画A')
    expect(wrapper.get('input[name="nameYomi"]').element.value).toBe('てすときかくえー')
    expect(wrapper.get('input[name="groupName"]').element.value).toBe('テスト大学')
    expect(wrapper.get('input[name="groupNameYomi"]').element.value).toBe('てすとだいがく')
    expect(wrapper.text()).toContain('必ずお読みください')
    expect(wrapper.text()).toContain('登録フォーム説明')
  })

  it('shows submitted status when submittedAt is set', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () =>
        HttpResponse.json({ ...circleDetailFixture, submittedAt: '2026-03-10T00:00:00Z' })
      ),
      http.put('/v1/circles/current/detail', () => HttpResponse.json({ ...circleDetailFixture, name: '更新後企画A' })),
      http.delete('/v1/circles/current', () => new HttpResponse(null, { status: 204 })),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

    const wrapper = mount(CircleDetailPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('提出済み')
    expect(wrapper.text()).not.toContain('保存して確認画面へ')
  })

  it('saves circle information successfully', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.put('/v1/circles/current/detail', () => HttpResponse.json({ ...circleDetailFixture, name: '更新後企画A' })),
      http.delete('/v1/circles/current', () => new HttpResponse(null, { status: 204 })),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

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
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.put('/v1/circles/current/detail', () =>
        HttpResponse.json({ message: 'Validation failed', errors: { name: ['保存失敗'] } }, { status: 422 })
      ),
      http.delete('/v1/circles/current', () => new HttpResponse(null, { status: 204 })),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

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
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.put('/v1/circles/current/detail', () => HttpResponse.json({ ...circleDetailFixture, name: '更新後企画A' })),
      http.delete('/v1/circles/current', () => new HttpResponse(null, { status: 204 })),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )

    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

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
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.put('/v1/circles/current/detail', () => HttpResponse.json({ ...circleDetailFixture, name: '更新後企画A' })),
      http.delete('/v1/circles/current', () => new HttpResponse(null, { status: 204 })),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    vi.stubGlobal(
      'confirm',
      vi.fn(() => false)
    )

    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()

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
