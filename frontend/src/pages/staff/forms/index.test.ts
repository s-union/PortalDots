import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffFormsIndexPage from './index.vue'

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

const formA = {
  circle: { id: '0195ec00-0022-7000-8000-000000000001', name: 'デモ企画B' },
  id: '0195ec00-0014-7000-8000-000000000001',
  name: '展示チェックフォーム',
  description: '展示レイアウトと機材使用申請を提出してください。',
  openAt: '2026-03-02T00:00:00Z',
  closeAt: '2026-03-22T23:59:59Z',
  maxAnswers: 2,
  answerableTags: ['展示'],
  confirmationMessage: '回答ありがとうございました。',
  isPublic: true,
  isOpen: true,
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z',
  isParticipationForm: false
}

const formB = {
  circle: { id: '0195ec00-0022-7000-8000-000000000001', name: 'デモ企画B' },
  id: '0195ec00-0010-7000-8000-000000000001',
  name: '締切済みフォーム',
  description: '',
  openAt: '2026-02-01T00:00:00Z',
  closeAt: '2026-02-10T23:59:59Z',
  maxAnswers: 1,
  answerableTags: [],
  confirmationMessage: '',
  isPublic: true,
  isOpen: false,
  createdAt: '2026-02-01T10:00:00Z',
  updatedAt: '2026-02-01T10:00:00Z',
  isParticipationForm: false
}

describe('StaffFormsIndexPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists staff forms for the current circle', async () => {
    server.use(http.get('/v1/staff/forms', () => HttpResponse.json([formA, formB])))

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: '0195ec00-0022-7000-8000-000000000001', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/forms', component: StaffFormsIndexPage },
        { path: '/staff/forms/create', component: { template: '<div>create</div>' } },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } }
      ]
    })
    await router.push('/staff/forms')
    await router.isReady()

    const wrapper = mount(StaffFormsIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('展示チェックフォーム')
    expect(wrapper.text()).toContain('締切済みフォーム')
    expect(wrapper.text().indexOf('締切済みフォーム')).toBeLessThan(wrapper.text().indexOf('展示チェックフォーム'))
    expect(wrapper.text()).toContain('展示')
    expect(wrapper.text()).toContain('全体に公開')
    expect(wrapper.text()).toContain('フォームID')
    expect(wrapper.get('a[href="/staff/forms/create"]').text()).toContain('新規フォーム')
    expect(wrapper.get('a[href="/staff/forms/0195ec00-0014-7000-8000-000000000001/answers"]').exists()).toBe(true)
  })

  it('links edit-only staff to the form settings page', async () => {
    server.use(http.get('/v1/staff/forms', () => HttpResponse.json([formA])))

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: '0195ec00-0022-7000-8000-000000000001', name: 'デモ企画B' },
      featureFlags: [],
      roles: [],
      permissions: ['staff.forms.read,edit'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/forms', component: StaffFormsIndexPage },
        { path: '/staff/forms/create', component: { template: '<div>create</div>' } },
        { path: '/staff/forms/:formId/edit', component: { template: '<div>edit</div>' } },
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } }
      ]
    })
    await router.push('/staff/forms')
    await router.isReady()

    const wrapper = mount(StaffFormsIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(
      wrapper
        .findAll('a[href="/staff/forms/0195ec00-0014-7000-8000-000000000001/edit"]')
        .some((link) => link.text().includes('展示チェックフォーム'))
    ).toBe(true)
    expect(wrapper.find('a[href="/staff/forms/0195ec00-0014-7000-8000-000000000001/answers"]').exists()).toBe(false)
    expect(wrapper.get('button[title="設定"]').exists()).toBe(true)
  })

  it('confirms before copying and deleting a staff form', async () => {
    const deleteRequests: string[] = []

    server.use(
      http.get('/v1/staff/forms', () => HttpResponse.json([formA])),
      http.post('/v1/staff/forms/0195ec00-0014-7000-8000-000000000001/copy', () =>
        HttpResponse.json(
          {
            circle: { id: '0195ec00-0022-7000-8000-000000000001', name: 'デモ企画B' },
            id: 'form-0195ec00-0022-7000-8000-000000000001-copy',
            name: '展示チェックフォームのコピー',
            description: '展示レイアウトと機材使用申請を提出してください。',
            openAt: '2026-03-02T00:00:00Z',
            closeAt: '2026-03-22T23:59:59Z',
            maxAnswers: 2,
            answerableTags: ['展示'],
            confirmationMessage: '回答ありがとうございました。',
            isPublic: false,
            isOpen: false,
            createdAt: '2026-03-01T10:00:00Z',
            updatedAt: '2026-03-01T10:00:00Z',
            isParticipationForm: false
          },
          { status: 201 }
        )
      ),
      http.delete('/v1/staff/forms/0195ec00-0014-7000-8000-000000000001', ({ request }) => {
        deleteRequests.push(request.url)
        return new HttpResponse(null, { status: 204 })
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: '0195ec00-0022-7000-8000-000000000001', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/forms', component: StaffFormsIndexPage },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/create', component: { template: '<div>create</div>' } },
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } }
      ]
    })
    await router.push('/staff/forms')
    await router.isReady()

    const confirmMock = vi
      .fn<(message?: string) => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)

    const wrapper = mount(StaffFormsIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const copyButton = wrapper.find('button[title="複製"]')
    await copyButton.trigger('click')
    await flushPromises()
    expect(confirmMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('フォーム「展示チェックフォーム」を複製しますか？')
    )
    expect(confirmMock).toHaveBeenNthCalledWith(1, expect.stringContaining('フォームが作成されます'))
    expect(router.currentRoute.value.fullPath).toBe('/staff/forms')

    await copyButton.trigger('click')
    await flushPromises()
    expect(confirmMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('非公開です。後から必要に応じて設定を変更してください')
    )
    expect(router.currentRoute.value.fullPath).toBe(
      '/staff/forms/form-0195ec00-0022-7000-8000-000000000001-copy/editor'
    )

    await router.push('/staff/forms')
    await flushPromises()

    const deleteButton = wrapper.find('button[title="削除"]')
    await deleteButton.trigger('click')
    await flushPromises()
    expect(confirmMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('フォーム「展示チェックフォーム」を削除しますか？')
    )
    expect(deleteRequests).toHaveLength(0)

    await deleteButton.trigger('click')
    await flushPromises()
    expect(confirmMock).toHaveBeenNthCalledWith(4, expect.stringContaining('設問、回答は全て削除されます'))
    expect(deleteRequests).toHaveLength(1)
  })

  it('moves back to the previous page when deleting the last form on the last page', async () => {
    const forms = Array.from({ length: 11 }, (_, index) => ({
      circle: { id: '0195ec00-0022-7000-8000-000000000001', name: 'デモ企画B' },
      id: `0195ec00-${String(100 + index).padStart(4, '0')}-7000-8000-000000000001`,
      name: index === 10 ? '物品申請フォーム' : `展示チェックフォーム${index + 1}`,
      description: index === 10 ? '備品を申請してください。' : '展示レイアウトと機材使用申請を提出してください。',
      openAt: '2026-03-02T00:00:00Z',
      closeAt: `2026-03-${String(index + 10).padStart(2, '0')}T23:59:59Z`,
      maxAnswers: index === 10 ? 1 : 2,
      answerableTags: index === 10 ? ['物品'] : ['展示'],
      confirmationMessage: index === 10 ? '' : '回答ありがとうございました。',
      isPublic: true,
      isOpen: true,
      createdAt: `2026-03-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
      updatedAt: `2026-03-${String(index + 2).padStart(2, '0')}T10:00:00Z`,
      isParticipationForm: false
    }))

    server.use(
      http.get('/v1/staff/forms', () => HttpResponse.json(forms)),
      http.delete('/v1/staff/forms/0195ec00-0110-7000-8000-000000000001', () => {
        forms.splice(
          forms.findIndex((form) => form.id === '0195ec00-0110-7000-8000-000000000001'),
          1
        )
        return new HttpResponse(null, { status: 204 })
      })
    )

    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: '0195ec00-0022-7000-8000-000000000001', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/forms', component: StaffFormsIndexPage },
        { path: '/staff/forms/create', component: { template: '<div>create</div>' } },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } }
      ]
    })
    await router.push('/staff/forms')
    await router.isReady()

    const wrapper = mount(StaffFormsIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('select').setValue('10')
    await flushPromises()
    await wrapper.get('button[title="最後のページ"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('物品申請フォーム')
    expect(wrapper.text()).toContain('ページ2 / 2')

    await wrapper.get('button[title="削除"]').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('展示チェックフォーム')
    expect(wrapper.text()).not.toContain('物品申請フォーム')
    expect(wrapper.text()).toContain('ページ1 / 1')
  })
})
