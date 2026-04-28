import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
const renderSvgMock = vi.hoisted(() => vi.fn())

vi.mock('uqr', () => ({
  renderSVG: renderSvgMock
}))

import CircleMembersPage from './members.vue'

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
  notes: '',
  leaderDisplayName: 'Demo User',
  canChangeGroupName: true,
  isLeader: true,
  lastUpdatedAt: '2026-03-20T00:00:00Z',
  usersCountMin: 1,
  usersCountMax: 4,
  memberCount: 2,
  canSubmit: true,
  formDescription: '',
  confirmationMessage: '',
  questions: [],
  answer: null,
  invitationToken: 'invite-token-xyz',
  submittedAt: null
}

const membersFixture = [
  { userId: 'leader-user', displayName: 'リーダーさん', isLeader: true },
  { userId: 'member-user', displayName: 'メンバーさん', isLeader: false }
]

describe('CircleMembersPage', () => {
  beforeEach(() => {
    renderSvgMock.mockReturnValue('<svg data-testid="invite-qr"></svg>')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setupTest(userId = 'leader-user') {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-a', name: 'テスト企画A' },
      featureFlags: [],
      roles: ['participant'],
      user: { id: userId, displayName: 'Demo User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/workspace/circles/detail',
          component: { template: '<div>detail</div>' }
        },
        {
          path: '/workspace/circles/confirm',
          component: { template: '<div>confirm</div>' }
        },
        { path: '/workspace/circles/members', component: CircleMembersPage }
      ]
    })

    return { pinia, router }
  }

  it('renders member list', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.get('/v1/circles/current/members', () => HttpResponse.json(membersFixture))
    )

    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/members')
    await router.isReady()

    const wrapper = mount(CircleMembersPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('リーダーさん')
    expect(wrapper.text()).toContain('メンバーさん')
    expect(wrapper.text()).toContain('リーダー')
    expect(wrapper.text()).toContain('メンバー')

    const qrImage = wrapper.get('img[alt="招待URLのQRコード"]')
    expect(qrImage.attributes('src')).toMatch(/^data:image\/svg\+xml;charset=utf-8,/)
  })

  it('shows empty state when no members', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.get('/v1/circles/current/members', () => HttpResponse.json([]))
    )

    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/members')
    await router.isReady()

    const wrapper = mount(CircleMembersPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('メンバーがいません')
  })

  it('shows delete button for non-leader members when current user is leader', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.get('/v1/circles/current/members', () => HttpResponse.json(membersFixture))
    )

    const { pinia, router } = setupTest('leader-user')
    await router.push('/workspace/circles/members')
    await router.isReady()

    const wrapper = mount(CircleMembersPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const deleteButtons = wrapper.findAll('button[type="button"]').filter((b) => b.text() === '削除')
    // リーダー自身は削除できないので、メンバー分だけ削除ボタンが出る
    expect(deleteButtons).toHaveLength(1)
  })

  it('does not show direct add member section', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.get('/v1/circles/current/members', () => HttpResponse.json(membersFixture))
    )

    const { pinia, router } = setupTest('leader-user')
    await router.push('/workspace/circles/members')
    await router.isReady()

    const wrapper = mount(CircleMembersPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain('メンバーを直接追加')
    expect(wrapper.find('input[placeholder="24a0000 / demo@example.com"]').exists()).toBe(false)
  })

  it('keeps invite regeneration available after submission', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () =>
        HttpResponse.json({ ...circleDetailFixture, submittedAt: '2026-03-20T00:00:00Z' })
      ),
      http.get('/v1/circles/current/members', () => HttpResponse.json(membersFixture))
    )

    const { pinia, router } = setupTest('leader-user')
    await router.push('/workspace/circles/members')
    await router.isReady()

    const wrapper = mount(CircleMembersPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('招待URLを再生成')
    expect(wrapper.text()).not.toContain('確認画面へ進む')
  })

  it('removes a member after confirmation', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.get('/v1/circles/current/members', () => HttpResponse.json(membersFixture)),
      http.delete('/v1/circles/current/members/:userID', () => new HttpResponse(null, { status: 204 }))
    )

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )

    const { pinia, router } = setupTest('leader-user')
    await router.push('/workspace/circles/members')
    await router.isReady()

    const wrapper = mount(CircleMembersPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const deleteButton = wrapper.findAll('button[type="button"]').find((b) => b.text() === '削除')
    if (!deleteButton) {
      throw new Error('delete button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    // エラーが表示されないことを確認
    expect(wrapper.text()).not.toContain('メンバーの削除に失敗しました')
  })

  it('shows error when member removal fails', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.get('/v1/circles/current/members', () => HttpResponse.json(membersFixture)),
      http.delete('/v1/circles/current/members/:userID', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      )
    )

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )

    const { pinia, router } = setupTest('leader-user')
    await router.push('/workspace/circles/members')
    await router.isReady()

    const wrapper = mount(CircleMembersPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const deleteButton = wrapper.findAll('button[type="button"]').find((b) => b.text() === '削除')
    if (!deleteButton) {
      throw new Error('delete button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('メンバーの削除に失敗しました')
  })

  it('shows fallback message when QR rendering fails', async () => {
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.get('/v1/circles/current/members', () => HttpResponse.json(membersFixture))
    )

    renderSvgMock.mockImplementation(() => {
      throw new Error('qr rendering error')
    })

    const { pinia, router } = setupTest('leader-user')
    await router.push('/workspace/circles/members')
    await router.isReady()

    const wrapper = mount(CircleMembersPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('QRコードの生成に失敗しました。招待URLをそのまま共有してください。')
    expect(wrapper.find('[data-testid="invite-qr"]').exists()).toBe(false)
  })
})
