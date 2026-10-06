import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import CircleDetailPage from './detail.vue'

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

const textQuestion = {
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
const answeredCircle = {
  ...circleDetailFixture,
  questions: [textQuestion],
  answer: {
    id: 'answer-circle',
    body: '',
    details: { 'question-text': ['初期の出店内容'] },
    uploads: [],
    updatedAt: '2026-03-20T00:00:00Z'
  }
}

describe('CircleDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
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

  async function mountDetail(attachTo?: HTMLElement) {
    const { pinia, router } = setupTest()
    await router.push('/workspace/circles/detail')
    await router.isReady()
    const wrapper = mount(
      { template: '<RouterView />' },
      {
        attachTo,
        global: { plugins: [pinia, router, createQueryPlugin()] }
      }
    )
    await flushPromises()
    return { wrapper, router }
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

    const saveButton = wrapper.findAll('button[type="submit"]').find((button) => button.text() === '保存する')
    if (!saveButton) {
      throw new Error('save button not found')
    }
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('企画参加登録の内容を保存しました')
  })

  it('accepts server-normalized basic information and clears the unsaved changes guard', async () => {
    const savedCircle = { ...circleDetailFixture, name: '保存済みの企画名', notes: '保存済みの備考' }
    let saved = false
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(saved ? savedCircle : circleDetailFixture)),
      http.put('/v1/circles/current/detail', () => {
        saved = true
        return HttpResponse.json(savedCircle)
      })
    )
    const { wrapper, router } = await mountDetail()
    await wrapper.get('input[name="name"]').setValue('正規化前の企画名')
    await wrapper.get('textarea[name="notes"]').setValue('正規化前の備考')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe(savedCircle.name)
    expect(wrapper.get<HTMLTextAreaElement>('textarea[name="notes"]').element.value).toBe(savedCircle.notes)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await router.push('/workspace')
    expect(confirm).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/workspace')
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

    const saveButton = wrapper.findAll('button[type="submit"]').find((button) => button.text() === '保存する')
    if (!saveButton) {
      throw new Error('save button not found')
    }
    await wrapper.get('form').trigger('submit')
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

  it('keeps edited basic information and answers while refreshing clean fields after an upload', async () => {
    const fixture = {
      ...answeredCircle,
      questions: [
        textQuestion,
        { ...textQuestion, id: 'question-upload', name: '資料', type: 'upload', isRequired: false }
      ]
    }
    let uploaded = false
    server.use(
      http.get('/v1/circles/current/detail', () =>
        HttpResponse.json(
          uploaded
            ? {
                ...fixture,
                notes: '最新の備考',
                questions: [
                  ...fixture.questions,
                  { ...textQuestion, id: 'question-added', name: '追加の補足', isRequired: false }
                ],
                answer: { ...fixture.answer, details: { ...fixture.answer.details, 'question-added': ['最新の補足'] } }
              }
            : fixture
        )
      ),
      http.post('/v1/forms/form-pt-exhibit/answer/uploads', () => {
        uploaded = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { wrapper, router } = await mountDetail()
    await wrapper.get('input[name="name"]').setValue('編集中の企画名')
    await wrapper.get('input[name="question-text"]').setValue('編集中の出店内容')
    const file = new File(['document'], 'layout.pdf', { type: 'application/pdf' })
    Object.defineProperty(wrapper.get('input[type="file"]').element, 'files', { configurable: true, value: [file] })
    await wrapper.get('input[type="file"]').trigger('change')
    const upload = wrapper.findAll('button').find((button) => button.text() === 'ファイルを追加')
    if (!upload) throw new Error('Upload button not found')
    await upload.trigger('click')
    await flushPromises()
    expect(uploaded).toBe(true)
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('編集中の企画名')
    expect(wrapper.get<HTMLInputElement>('input[name="question-text"]').element.value).toBe('編集中の出店内容')
    expect(wrapper.get<HTMLTextAreaElement>('textarea[name="notes"]').element.value).toBe('最新の備考')
    expect(wrapper.get<HTMLInputElement>('input[name="question-added"]').element.value).toBe('最新の補足')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await router.push('/workspace')
    expect(confirm).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/workspace/circles/detail')
  })

  it('validates basic information and typed answers before sending one combined payload', async () => {
    const fixture = {
      ...answeredCircle,
      questions: [
        textQuestion,
        { ...textQuestion, id: 'question-choices', name: '備品', type: 'checkbox', options: ['机', '椅子'] }
      ]
    }
    const payloads: unknown[] = []
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(fixture)),
      http.put('/v1/circles/current/detail', async ({ request }) => {
        payloads.push(await request.json())
        return HttpResponse.json({
          ...fixture,
          name: '新しい企画名',
          answer: { ...fixture.answer, details: { 'question-text': ['新しい出店内容'], 'question-choices': ['机'] } }
        })
      })
    )
    const { wrapper } = await mountDetail(document.body)
    await wrapper.get('input[name="name"]').setValue('')
    await wrapper.get('input[name="question-text"]').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('企画名を入力してください')
    expect(wrapper.text()).toContain('出店内容を入力してください')
    expect(wrapper.text()).toContain('備品を選択してください')
    expect(document.activeElement).toBe(wrapper.get('input[name="name"]').element)
    expect(wrapper.get('input[name="name"]').attributes('aria-describedby')).toBe('circle-name-error')
    expect(wrapper.get('#circle-name-error').text()).toBe('企画名を入力してください')
    expect(payloads).toEqual([])
    await wrapper.get('input[name="name"]').setValue('新しい企画名')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('出店内容を入力してください')
    expect(wrapper.text()).toContain('備品を選択してください')
    expect(document.activeElement).toBe(wrapper.get('input[name="question-text"]').element)
    expect(payloads).toEqual([])
    await wrapper.get('input[name="question-text"]').setValue('新しい出店内容')
    await wrapper.get('input[type="checkbox"][value="机"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(payloads).toEqual([
      {
        name: '新しい企画名',
        nameYomi: 'てすときかくえー',
        groupName: 'テスト大学',
        groupNameYomi: 'てすとだいがく',
        notes: '備考テキスト',
        details: { 'question-text': '新しい出店内容', 'question-choices': ['机'] }
      }
    ])
  })

  it('retains later edits and stays on the page when saving to continue', async () => {
    const pending = Promise.withResolvers<Response>()
    let saved = false
    let requests = 0
    const savedCircle = {
      ...answeredCircle,
      name: '保存済み企画名',
      answer: { ...answeredCircle.answer, details: { 'question-text': ['保存済みの出店内容'] } }
    }
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(saved ? savedCircle : answeredCircle)),
      http.put('/v1/circles/current/detail', () => {
        requests++
        return pending.promise
      })
    )
    const { wrapper, router } = await mountDetail()
    await wrapper.get('input[name="name"]').setValue('保存済み企画名')
    await wrapper.get('input[name="question-text"]').setValue('保存済みの出店内容')
    await wrapper.get('form').trigger('submit', { submitter: wrapper.get('button[value="continue"]').element })
    await flushPromises()
    expect(wrapper.get<HTMLButtonElement>('button[value="continue"]').element.disabled).toBe(true)
    await wrapper.get('input[name="name"]').setValue('送信後の企画名')
    await wrapper.get('input[name="question-text"]').setValue('送信後の出店内容')
    await wrapper.get('form').trigger('submit')
    saved = true
    pending.resolve(HttpResponse.json(savedCircle))
    await flushPromises()
    expect(requests).toBe(1)
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('送信後の企画名')
    expect(wrapper.get<HTMLInputElement>('input[name="question-text"]').element.value).toBe('送信後の出店内容')
    expect(router.currentRoute.value.path).toBe('/workspace/circles/detail')
    await wrapper.get('input[name="name"]').setValue('保存済み企画名')
    await wrapper.get('input[name="question-text"]').setValue('保存済みの出店内容')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await router.push('/workspace')
    expect(confirm).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/workspace')
  })

  it.each([true, false])('continues only after a successful save without an answer (success: %s)', async (success) => {
    server.use(
      http.get('/v1/circles/current/detail', () => HttpResponse.json(circleDetailFixture)),
      http.put('/v1/circles/current/detail', () =>
        success ? HttpResponse.json(circleDetailFixture) : HttpResponse.json({ message: '保存失敗' }, { status: 500 })
      )
    )
    const { wrapper, router } = await mountDetail()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await wrapper.get('form').trigger('submit', { submitter: wrapper.get('button[value="continue"]').element })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(success ? '/workspace/circles/members' : '/workspace/circles/detail')
    expect(confirm).not.toHaveBeenCalled()
    if (!success) expect(wrapper.text()).toContain('企画情報の更新に失敗しました。')
  })
})
