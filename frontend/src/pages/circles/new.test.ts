import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import CircleCreatePage from './new.vue'

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

const registrationFormFixture = {
  id: '',
  name: '',
  nameYomi: '',
  groupName: '',
  groupNameYomi: '',
  participationTypeId: 'pt-exhibit',
  participationTypeName: '展示',
  formId: 'form-pt-exhibit',
  notes: '',
  leaderDisplayName: 'Demo User',
  canChangeGroupName: true,
  isLeader: true,
  lastUpdatedAt: '',
  usersCountMin: 1,
  usersCountMax: 4,
  memberCount: 1,
  canSubmit: true,
  formDescription: '展示参加用の設問です',
  confirmationMessage: '',
  questions: [],
  answer: null,
  invitationToken: '',
  submittedAt: null
}

const twoParticipationTypes = [
  {
    id: 'pt-exhibit',
    name: '展示',
    description: '展示企画です',
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
  },
  {
    id: 'pt-food',
    name: '模擬店',
    description: '模擬店企画です',
    usersCountMin: 2,
    usersCountMax: 6,
    tags: [],
    form: {
      id: 'form-pt-food',
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
]

function setupDefaultHandlers(options: { createShouldSucceed?: boolean } = {}) {
  const { createShouldSucceed = true } = options
  server.use(
    http.get('/v1/participation-types', () => HttpResponse.json(twoParticipationTypes)),
    http.get('/v1/participation-types/pt-exhibit/registration-form', () => HttpResponse.json(registrationFormFixture)),
    http.get('/v1/participation-types/pt-food/registration-form', () =>
      HttpResponse.json({
        ...registrationFormFixture,
        participationTypeId: 'pt-food',
        participationTypeName: '模擬店',
        formId: 'form-pt-food',
        usersCountMin: 2,
        usersCountMax: 6
      })
    ),
    http.post('/v1/circles', () => {
      if (!createShouldSucceed) {
        return HttpResponse.json({ message: 'Validation failed', errors: { name: ['必須'] } }, { status: 422 })
      }
      return HttpResponse.json(
        {
          ...registrationFormFixture,
          id: 'new-circle',
          name: 'テスト企画',
          groupName: 'テスト大学',
          invitationToken: 'token-abc'
        },
        { status: 201 }
      )
    }),
    http.get('/v1/session/bootstrap', () =>
      HttpResponse.json({
        csrfToken: 'csrf-token',
        currentCircle: { id: 'new-circle', name: 'テスト企画' },
        featureFlags: [],
        roles: ['participant'],
        user: { id: 'demo-user', displayName: 'Demo User' }
      })
    )
  )
}

describe('CircleCreatePage', () => {
  function setupSession(options: { canCreateCircleRegistration?: boolean } = {}) {
    const { canCreateCircleRegistration = true } = options
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: { id: 'demo-user', displayName: 'Demo User', canCreateCircleRegistration }
    })
    return pinia
  }

  it('renders the create form with participation types', async () => {
    let participationTypesCalled = false
    server.use(
      http.get('/v1/participation-types', () => {
        participationTypesCalled = true
        return HttpResponse.json(twoParticipationTypes)
      }),
      http.get('/v1/participation-types/pt-exhibit/registration-form', () =>
        HttpResponse.json(registrationFormFixture)
      ),
      http.get('/v1/participation-types/pt-food/registration-form', () =>
        HttpResponse.json({
          ...registrationFormFixture,
          participationTypeId: 'pt-food',
          participationTypeName: '模擬店',
          formId: 'form-pt-food',
          usersCountMin: 2,
          usersCountMax: 6
        })
      ),
      http.post('/v1/circles', () =>
        HttpResponse.json(
          {
            ...registrationFormFixture,
            id: 'new-circle',
            name: 'テスト企画',
            groupName: 'テスト大学',
            invitationToken: 'token-abc'
          },
          { status: 201 }
        )
      ),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: { id: 'new-circle', name: 'テスト企画' },
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/circles/new', component: CircleCreatePage },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } },
        { path: '/workspace/circles/confirm', component: { template: '<div>confirm</div>' } }
      ]
    })
    await router.push('/circles/new')
    await router.isReady()

    const wrapper = mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('企画情報')
    expect(wrapper.text()).toContain('展示')
    expect(wrapper.text()).toContain('模擬店')
    expect((wrapper.get('input[name="leaderDisplayName"]').element as HTMLInputElement).value).toBe('Demo User')
    expect(wrapper.text()).toContain('確認画面へ')

    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()

    expect(wrapper.text()).toContain('メンバー')
    expect(wrapper.text()).toContain('必ずお読みください')
    expect(wrapper.text()).toContain('展示参加用の設問です')
    expect(participationTypesCalled).toBe(true)
  })

  it('preselects the participation type from the legacy query parameter', async () => {
    setupDefaultHandlers()

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/circles/new', component: CircleCreatePage }]
    })
    await router.push('/circles/new?participation_type=pt-food')
    await router.isReady()

    const wrapper = mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('URL パラメータで指定された参加種別を自動選択しています')
    expect((wrapper.get('select[name="participationTypeId"]').element as HTMLSelectElement).value).toBe('pt-food')
    expect(wrapper.text()).toContain('企画責任者の方が行ってください')
  })

  it('navigates to confirm page after successful creation', async () => {
    setupDefaultHandlers()

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/circles/new', component: CircleCreatePage },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } },
        { path: '/workspace/circles/confirm', component: { template: '<div>confirm</div>' } }
      ]
    })
    await router.push('/circles/new')
    await router.isReady()

    const wrapper = mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()
    await wrapper.get('input[name="name"]').setValue('テスト企画')
    await wrapper.get('input[name="nameYomi"]').setValue('てすときかく')
    await wrapper.get('input[name="groupName"]').setValue('テスト大学')
    await wrapper.get('input[name="groupNameYomi"]').setValue('てすとだいがく')
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/workspace/circles/members')
  })

  it('shows error message when creation fails', async () => {
    setupDefaultHandlers({ createShouldSucceed: false })

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/new', component: CircleCreatePage },
        { path: '/workspace/circles/confirm', component: { template: '<div>confirm</div>' } }
      ]
    })
    await router.push('/circles/new')
    await router.isReady()

    const wrapper = mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()
    await wrapper.get('input[name="name"]').setValue('テスト企画')
    await wrapper.get('input[name="nameYomi"]').setValue('てすときかく')
    await wrapper.get('input[name="groupName"]').setValue('テスト大学')
    await wrapper.get('input[name="groupNameYomi"]').setValue('てすとだいがく')
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('必須')
    expect(router.currentRoute.value.path).toBe('/circles/new')
  })

  it('shows denied state for member-only users', async () => {
    let participationTypesCalled = false
    server.use(
      http.get('/v1/participation-types', () => {
        participationTypesCalled = true
        return HttpResponse.json(twoParticipationTypes)
      })
    )

    const pinia = setupSession({ canCreateCircleRegistration: false })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/circles/new', component: CircleCreatePage }]
    })
    await router.push('/circles/new')
    await router.isReady()

    const wrapper = mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('このアカウントでは新しい企画を登録できません。')
    expect(wrapper.find('select[name="participationTypeId"]').exists()).toBe(false)
    expect(participationTypesCalled).toBe(false)
  })

  it('shows real-time validation error for nameYomi on input', async () => {
    setupDefaultHandlers()

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/new', component: CircleCreatePage },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } }
      ]
    })
    await router.push('/circles/new')
    await router.isReady()

    const wrapper = mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()

    const nameYomiInput = wrapper.get('input[name="nameYomi"]')
    await nameYomiInput.setValue('テスト企画')
    await nameYomiInput.trigger('input')
    await flushPromises()

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.text()).toContain('ひらがなで入力してください')
    expect(router.currentRoute.value.path).toBe('/circles/new')
  })

  it('shows client-side validation error for nameYomi with non-hiragana characters', async () => {
    setupDefaultHandlers()

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/new', component: CircleCreatePage },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } }
      ]
    })
    await router.push('/circles/new')
    await router.isReady()

    const wrapper = mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()

    const nameYomiInput = wrapper.get('input[name="nameYomi"]')
    await nameYomiInput.setValue('テスト企画')
    await nameYomiInput.trigger('blur')
    await flushPromises()

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.text()).toContain('ひらがなで入力してください')
    expect(router.currentRoute.value.path).toBe('/circles/new')
  })

  it('prevents form submission when participation type is not selected', async () => {
    setupDefaultHandlers()

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/new', component: CircleCreatePage },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } }
      ]
    })
    await router.push('/circles/new')
    await router.isReady()

    const wrapper = mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    // Fill form but do not select participation type
    await wrapper.get('input[name="name"]').setValue('テスト企画')
    await wrapper.get('input[name="nameYomi"]').setValue('てすときかく')
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()

    // Wait for validation
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.text()).toContain('参加種別を選択してください')
    expect(router.currentRoute.value.path).toBe('/circles/new')
  })

  it('prevents form submission when required fields are empty', async () => {
    setupDefaultHandlers()

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/new', component: CircleCreatePage },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } }
      ]
    })
    await router.push('/circles/new')
    await router.isReady()

    const wrapper = mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()

    // Leave name empty
    await wrapper.get('input[name="nameYomi"]').setValue('てすときかく')
    await wrapper.get('input[name="groupName"]').setValue('テスト大学')
    await wrapper.get('input[name="groupNameYomi"]').setValue('てすとだいがく')
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()

    // Wait for validation
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.text()).toContain('企画名を入力してください')
    expect(router.currentRoute.value.path).toBe('/circles/new')
  })
})
