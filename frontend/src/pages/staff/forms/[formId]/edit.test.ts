import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffFormEditPage from './edit.vue'

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

describe('StaffFormEditPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders and updates staff form settings', async () => {
    let updatedName = '展示チェックフォーム'
    let updatedMaxAnswers = 2
    let updatedTags = ['展示']
    let updatedConfirmationMessage = '回答ありがとうございました。'
    let updatedRequestBody: Record<string, unknown> | null = null

    server.use(
      http.get('/v1/staff/tags', () =>
        HttpResponse.json([
          { id: 'tag-exhibit', name: '展示' },
          { id: 'tag-required', name: '必須' }
        ])
      ),
      http.get('/v1/staff/forms/form-circle-b-1', () =>
        HttpResponse.json({
          circle: { id: 'circle-b', name: 'デモ企画B' },
          id: 'form-circle-b-1',
          name: updatedName,
          description: '展示レイアウトと機材使用申請を提出してください。',
          openAt: '2026-03-02T00:00:00Z',
          closeAt: '2026-03-22T23:59:59Z',
          maxAnswers: updatedMaxAnswers,
          answerableTags: updatedTags,
          confirmationMessage: updatedConfirmationMessage,
          isPublic: true,
          isOpen: true,
          createdAt: '2026-03-01T12:00:00Z',
          updatedAt: '2026-03-01T12:00:00Z',
          isParticipationForm: false,
          questions: [],
          answer: {
            id: 'answer-1',
            body: '展示位置は正面入口側を希望します。',
            updatedAt: '2026-03-05T10:00:00Z',
            details: {},
            uploads: []
          }
        })
      ),
      http.put('/v1/staff/forms/form-circle-b-1', async ({ request }) => {
        updatedRequestBody = (await request.json()) as Record<string, unknown>
        updatedName = '更新後フォーム'
        updatedMaxAnswers = 3
        updatedTags = ['展示', '必須']
        updatedConfirmationMessage = '送信が完了しました。'
        return HttpResponse.json({
          circle: { id: 'circle-b', name: 'デモ企画B' },
          id: 'form-circle-b-1',
          name: updatedName,
          description: '更新後の説明',
          openAt: '2026-03-02T00:00:00Z',
          closeAt: '2026-03-22T23:59:59Z',
          maxAnswers: updatedMaxAnswers,
          answerableTags: updatedTags,
          confirmationMessage: updatedConfirmationMessage,
          isPublic: true,
          isOpen: true,
          createdAt: '2026-03-01T12:00:00Z',
          updatedAt: '2026-03-01T12:00:00Z',
          isParticipationForm: false
        })
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/forms', component: { template: '<div>forms</div>' } },
        { path: '/staff/forms/:formId/edit', component: StaffFormEditPage },
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/preview', component: { template: '<div>preview</div>' } }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/edit')
    await router.isReady()

    const wrapper = mount(StaffFormEditPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('展示チェックフォーム')

    await wrapper.get('input[name="name"]').setValue('更新後フォーム')
    await wrapper.get('input[name="openAt"]').setValue('2026-03-02T09:30')
    await wrapper.get('input[name="closeAt"]').setValue('2026-03-22T18:45')
    await wrapper.get('input[name="maxAnswers"]').setValue('3')
    await wrapper.get('input[name="answerableTags"]').setValue('必')
    const requiredTagButton = wrapper.findAll('button').find((button) => button.text() === '必須')
    if (!requiredTagButton) {
      throw new Error('required tag button not found')
    }
    await requiredTagButton.trigger('click')
    await wrapper.get('textarea[name="confirmationMessage"]').setValue('送信が完了しました。')
    const saveFormButton = wrapper
      .findAll('button[type="button"]')
      .find((button) => button.text().includes('変更を保存'))
    if (!saveFormButton) {
      throw new Error('save form button not found')
    }
    await saveFormButton.trigger('click')
    await flushPromises()

    expect(updatedRequestBody).toMatchObject({
      maxAnswers: 3,
      answerableTags: ['展示', '必須'],
      confirmationMessage: '送信が完了しました。'
    })
    expect(String(updatedRequestBody?.openAt)).toMatch(/^2026-03-02T/)
    expect(String(updatedRequestBody?.closeAt)).toMatch(/^2026-03-22T/)
  })

  it('confirms before copying and deleting the current form', async () => {
    const deleteRequests: string[] = []

    server.use(
      http.get('/v1/staff/tags', () => HttpResponse.json([{ id: 'tag-exhibit', name: '展示' }])),
      http.get('/v1/staff/forms/form-circle-b-1', () =>
        HttpResponse.json({
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
          createdAt: '2026-03-01T12:00:00Z',
          updatedAt: '2026-03-01T12:00:00Z',
          isParticipationForm: false,
          questions: [],
          answer: null
        })
      ),
      http.post('/v1/staff/forms/form-circle-b-1/copy', () =>
        HttpResponse.json(
          {
            id: 'form-circle-b-copy',
            name: '展示チェックフォームのコピー',
            description: '展示レイアウトと機材使用申請を提出してください。',
            openAt: '2026-03-02T00:00:00Z',
            closeAt: '2026-03-22T23:59:59Z',
            maxAnswers: 2,
            answerableTags: ['展示'],
            confirmationMessage: '回答ありがとうございました。',
            isPublic: false,
            isOpen: false,
            createdAt: '2026-03-01T12:00:00Z',
            updatedAt: '2026-03-01T12:00:00Z',
            isParticipationForm: false
          },
          { status: 201 }
        )
      ),
      http.delete('/v1/staff/forms/form-circle-b-1', ({ request }) => {
        deleteRequests.push(request.url)
        return new HttpResponse(null, { status: 204 })
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/forms', component: { template: '<div>forms</div>' } },
        { path: '/staff/forms/:formId/edit', component: StaffFormEditPage },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } },
        { path: '/staff/forms/:formId/preview', component: { template: '<div>preview</div>' } }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/edit')
    await router.isReady()

    const confirmMock = vi
      .fn<(message?: string) => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)

    const wrapper = mount(StaffFormEditPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const buttonLabels = ['複製', '削除']
    for (const [index, label] of buttonLabels.entries()) {
      const button = wrapper.findAll('button[type="button"]').find((candidate) => candidate.text().includes(label))
      if (!button) {
        throw new Error(`${label} button not found at step ${index}`)
      }

      await button.trigger('click')
      await flushPromises()

      if (label === '複製') {
        expect(confirmMock).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('フォーム「展示チェックフォーム」を複製しますか？')
        )
        expect(router.currentRoute.value.fullPath).toBe('/staff/forms/form-circle-b-1/edit')

        await button.trigger('click')
        await flushPromises()
        expect(confirmMock).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('非公開です。後から必要に応じて設定を変更してください')
        )
        expect(router.currentRoute.value.fullPath).toBe('/staff/forms/form-circle-b-copy/editor')

        await router.push('/staff/forms/form-circle-b-1/edit')
        await flushPromises()
      } else {
        expect(confirmMock).toHaveBeenNthCalledWith(
          3,
          expect.stringContaining('フォーム「展示チェックフォーム」を削除しますか？')
        )
        expect(deleteRequests).toHaveLength(0)

        await button.trigger('click')
        await flushPromises()
        expect(confirmMock).toHaveBeenNthCalledWith(4, expect.stringContaining('設問、回答は全て削除されます'))
        expect(deleteRequests).toHaveLength(1)
        expect(router.currentRoute.value.fullPath).toBe('/staff/forms')
      }
    }
  })

  it('shows participation forms as question-editor only', async () => {
    server.use(
      http.get('/v1/staff/forms/form-participation-exhibit', () =>
        HttpResponse.json({
          id: 'form-participation-exhibit',
          name: '企画参加登録',
          description: '参加登録を提出してください。',
          openAt: '2026-03-01T00:00:00Z',
          closeAt: '2026-03-31T23:59:59Z',
          maxAnswers: 1,
          answerableTags: [],
          confirmationMessage: 'ありがとうございました。',
          isPublic: true,
          isOpen: true,
          createdAt: '2026-03-01T00:00:00Z',
          updatedAt: '2026-03-01T00:00:00Z',
          isParticipationForm: true,
          questions: [
            {
              id: 'question-1',
              name: '追加設問',
              description: '補足事項を入力してください',
              type: 'text',
              isRequired: false,
              numberMin: null,
              numberMax: null,
              allowedTypes: '',
              options: [],
              priority: 1,
              createdAt: '2026-03-01T00:00:00Z',
              updatedAt: '2026-03-01T00:00:00Z'
            }
          ],
          answer: null
        })
      )
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/forms', component: { template: '<div>forms</div>' } },
        { path: '/staff/forms/:formId/edit', component: StaffFormEditPage },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } },
        { path: '/staff/forms/:formId/preview', component: { template: '<div>preview</div>' } }
      ]
    })
    await router.push('/staff/forms/form-participation-exhibit/edit')
    await router.isReady()

    const wrapper = mount(StaffFormEditPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain(
      'このフォームは参加登録フォームです。基本設定は参加種別画面で管理し、ここでは設問編集のみ行えます。'
    )
    expect(wrapper.text()).toContain(
      '参加登録フォームの公開設定・受付期間・人数条件は参加種別画面から変更してください。'
    )
    expect(wrapper.get('input[name="name"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('textarea[name="description"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('複製')
    expect(wrapper.text()).toContain('参加種別画面で編集')
  })
})
