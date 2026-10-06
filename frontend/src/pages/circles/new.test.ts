import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import CircleCreatePage from './new.vue'

enableAutoUnmount(afterEach)

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

const registrationQuestion = {
  id: 'question-text',
  name: '出店内容',
  description: '',
  type: 'text',
  isRequired: true,
  numberMin: null,
  numberMax: null,
  allowedTypes: '',
  options: [],
  priority: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
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
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  async function mountRegistration() {
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
    const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router, createQueryPlugin()] } })
    await flushPromises()
    return { wrapper, router }
  }

  async function fillBasicInfo(wrapper: ReturnType<typeof mount>) {
    await wrapper.get('input[name="name"]').setValue('テスト企画')
    await wrapper.get('input[name="nameYomi"]').setValue('てすときかく')
    await wrapper.get('input[name="groupName"]').setValue('テスト大学')
    await wrapper.get('input[name="groupNameYomi"]').setValue('てすとだいがく')
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
    await wrapper.get('form').trigger('submit')
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
    await wrapper.get('form').trigger('submit')
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
    await wrapper.get('form').trigger('submit')
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
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    // Wait for validation
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.text()).toContain('企画名を入力してください')
    expect(router.currentRoute.value.path).toBe('/circles/new')
  })

  it('warns before leaving when the form has unsaved input', async () => {
    setupDefaultHandlers()

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/circles/new', component: CircleCreatePage },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } }
      ]
    })
    await router.push('/circles/new')
    await router.isReady()

    const App = { template: '<router-view />' }
    const wrapper = mount(App, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await wrapper.get('input[name="name"]').setValue('テスト企画')
    await flushPromises()

    await router.push('/')
    expect(confirmSpy).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/circles/new')
  })

  it('does not warn when navigating away after a successful submit', async () => {
    setupDefaultHandlers()

    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/circles/new', component: CircleCreatePage },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } }
      ]
    })
    await router.push('/circles/new')
    await router.isReady()

    const App = { template: '<router-view />' }
    const wrapper = mount(App, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()
    await wrapper.get('input[name="name"]').setValue('テスト企画')
    await wrapper.get('input[name="nameYomi"]').setValue('てすときかく')
    await wrapper.get('input[name="groupName"]').setValue('テスト大学')
    await wrapper.get('input[name="groupNameYomi"]').setValue('てすとだいがく')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/workspace/circles/members')
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  function setupParticipationSwitchHandlers() {
    server.use(
      http.get('/v1/participation-types', () => HttpResponse.json(twoParticipationTypes)),
      http.get('/v1/participation-types/pt-exhibit/registration-form', () =>
        HttpResponse.json({
          ...registrationFormFixture,
          questions: [
            {
              id: 'question-exhibit',
              name: '出店内容',
              description: '',
              type: 'text',
              isRequired: true,
              numberMin: null,
              numberMax: null,
              allowedTypes: '',
              options: [],
              priority: 1,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z'
            }
          ]
        })
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

  function setupParticipationSwitchPage() {
    const pinia = setupSession()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/circles/new', component: CircleCreatePage }]
    })
    return { pinia, router }
  }

  function mountParticipationSwitchPage(
    pinia: ReturnType<typeof setupSession>,
    router: ReturnType<typeof createRouter>
  ) {
    return mount(CircleCreatePage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
  }

  function findExhibitQuestionInput(wrapper: ReturnType<typeof mount>) {
    const inputs = wrapper.findAll('input[type="text"]').filter((item) => !item.element.hasAttribute('readonly'))
    const input = inputs[inputs.length - 1]
    if (!input) {
      throw new Error('Exhibit question input was not rendered')
    }
    return input
  }

  it('warns and keeps the participation type and draft when switching while dirty', async () => {
    setupParticipationSwitchHandlers()
    const { pinia, router } = setupParticipationSwitchPage()
    const wrapper = mountParticipationSwitchPage(pinia, router)
    await flushPromises()

    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()

    const questionInput = findExhibitQuestionInput(wrapper)
    await questionInput.setValue('展示ブースで出店します')

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await wrapper.get('select[name="participationTypeId"]').setValue('pt-food')
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalled()
    expect((wrapper.get('select[name="participationTypeId"]').element as HTMLSelectElement).value).toBe('pt-exhibit')
    expect((findExhibitQuestionInput(wrapper).element as HTMLInputElement).value).toBe('展示ブースで出店します')
  })

  it('switches participation type after confirming while the draft is dirty', async () => {
    setupParticipationSwitchHandlers()
    const { pinia, router } = setupParticipationSwitchPage()
    const wrapper = mountParticipationSwitchPage(pinia, router)
    await flushPromises()

    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()

    const questionInput = findExhibitQuestionInput(wrapper)
    await questionInput.setValue('展示ブースで出店します')

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await wrapper.get('select[name="participationTypeId"]').setValue('pt-food')
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalled()
    expect((wrapper.get('select[name="participationTypeId"]').element as HTMLSelectElement).value).toBe('pt-food')
  })

  it('validates typed answers and preserves the combined payload after a failed creation', async () => {
    setupDefaultHandlers()
    const payloads: unknown[] = []
    server.use(
      http.get('/v1/participation-types/pt-exhibit/registration-form', () =>
        HttpResponse.json({
          ...registrationFormFixture,
          questions: [
            registrationQuestion,
            { ...registrationQuestion, id: 'question-choices', name: '備品', type: 'checkbox', options: ['机', '椅子'] }
          ]
        })
      ),
      http.post('/v1/circles', async ({ request }) => {
        payloads.push(await request.json())
        return payloads.length === 1
          ? HttpResponse.json({ message: '作成失敗' }, { status: 500 })
          : HttpResponse.json({ ...registrationFormFixture, id: 'new-circle' }, { status: 201 })
      })
    )
    const { wrapper, router } = await mountRegistration()
    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()
    await fillBasicInfo(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('出店内容を入力してください')
    expect(wrapper.text()).toContain('備品を選択してください')
    expect(payloads).toEqual([])
    await wrapper.get('input[name="question-text"]').setValue('展示企画')
    await wrapper.get('input[type="checkbox"][value="机"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('企画の作成に失敗しました。入力内容をご確認ください。')
    expect(wrapper.get<HTMLInputElement>('input[name="question-text"]').element.value).toBe('展示企画')
    expect(wrapper.get<HTMLInputElement>('input[type="checkbox"][value="机"]').element.checked).toBe(true)
    const expected = {
      name: 'テスト企画',
      nameYomi: 'てすときかく',
      groupName: 'テスト大学',
      groupNameYomi: 'てすとだいがく',
      participationTypeId: 'pt-exhibit',
      notes: '',
      details: { 'question-text': '展示企画', 'question-choices': ['机'] }
    }
    expect(payloads).toEqual([expected])
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(payloads).toEqual([expected, expected])
    expect(router.currentRoute.value.path).toBe('/workspace/circles/members')
  })

  it('discards answers with identical question IDs across participation types while retaining basic information', async () => {
    setupDefaultHandlers()
    server.use(
      http.get('/v1/participation-types/:typeId/registration-form', ({ params }) =>
        HttpResponse.json({
          ...registrationFormFixture,
          participationTypeId: params.typeId,
          formId: `form-${String(params.typeId)}`,
          questions: [registrationQuestion]
        })
      )
    )
    const { wrapper } = await mountRegistration()
    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()
    await fillBasicInfo(wrapper)
    await wrapper.get('input[name="question-text"]').setValue('展示用の回答')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await wrapper.get('select[name="participationTypeId"]').setValue('pt-food')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[name="question-text"]').element.value).toBe('展示用の回答')
    confirm.mockReturnValue(true)
    await wrapper.get('select[name="participationTypeId"]').setValue('pt-food')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[name="question-text"]').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('テスト企画')
    expect(wrapper.get<HTMLInputElement>('input[name="groupName"]').element.value).toBe('テスト大学')
    confirm.mockClear()
    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()
    expect(confirm).not.toHaveBeenCalled()
    expect(wrapper.get<HTMLInputElement>('input[name="question-text"]').element.value).toBe('')
  })

  it('blocks submission until questions load and defers uploads to the edit screen', async () => {
    setupDefaultHandlers()
    const pending = Promise.withResolvers<Response>()
    let saves = 0
    server.use(
      http.get('/v1/participation-types/pt-exhibit/registration-form', () => pending.promise),
      http.post('/v1/circles', () => {
        saves++
        return HttpResponse.json({ ...registrationFormFixture, id: 'new-circle' }, { status: 201 })
      })
    )
    const { wrapper } = await mountRegistration()
    await wrapper.get('select[name="participationTypeId"]').setValue('pt-exhibit')
    await flushPromises()
    await fillBasicInfo(wrapper)
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(saves).toBe(0)
    pending.resolve(
      HttpResponse.json({
        ...registrationFormFixture,
        questions: [{ ...registrationQuestion, id: 'question-upload', name: '資料', type: 'upload', isRequired: false }]
      })
    )
    await flushPromises()
    expect(wrapper.text()).toContain('添付ファイルは企画作成後の編集画面でアップロードできます。')
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(saves).toBe(1)
  })
})
