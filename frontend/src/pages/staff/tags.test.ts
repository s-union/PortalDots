import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffTagsPage from './tags.vue'

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

describe('StaffTagsPage', () => {
  it('lists, creates, updates, and deletes tags', async () => {
    const tags = [
      { id: 'tag-2', name: '展示', createdAt: '2021-06-07T12:42:19+09:00', updatedAt: '2021-06-07T12:42:19+09:00' },
      { id: 'tag-1', name: '飲食', createdAt: '2021-06-07T12:42:18+09:00', updatedAt: '2021-06-07T12:42:18+09:00' }
    ]

    server.use(
      http.get('/v1/staff/tags', () => HttpResponse.json(tags)),
      http.post('/v1/staff/tags', () => {
        tags.push({
          id: 'tag-3',
          name: '新規タグ',
          createdAt: '2021-06-07T12:42:20+09:00',
          updatedAt: '2021-06-07T12:42:20+09:00'
        })
        return HttpResponse.json(tags[2], { status: 201 })
      }),
      http.put('/v1/staff/tags/tag-1', () => {
        const targetIndex = tags.findIndex((tag) => tag.id === 'tag-1')
        tags[targetIndex] = {
          id: 'tag-1',
          name: '更新タグ',
          createdAt: '2021-06-07T12:42:18+09:00',
          updatedAt: '2021-06-07T12:42:21+09:00'
        }
        return HttpResponse.json(tags[targetIndex])
      }),
      http.delete('/v1/staff/tags/tag-1', () => {
        tags.splice(
          tags.findIndex((tag) => tag.id === 'tag-1'),
          1
        )
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
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/tags', component: StaffTagsPage }
      ]
    })
    await router.push('/staff/tags')
    await router.isReady()

    const confirmMock = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmMock)

    const wrapper = mount(StaffTagsPage, {
      attachTo: document.body,
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('飲食')
    expect(wrapper.text()).toContain('タグID')
    expect(wrapper.text().indexOf('飲食')).toBeLessThan(wrapper.text().indexOf('展示'))
    expect(wrapper.get('a[href$="/v1/staff/tags/export"]').text()).toContain('CSVで出力')

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()

    const createNameInput = document.body.querySelector('input[name="name"]')
    if (!(createNameInput instanceof HTMLInputElement)) {
      throw new Error('create name input not found')
    }
    createNameInput.value = '新規タグ'
    createNameInput.dispatchEvent(new Event('input'))
    const createSubmitButton = document.body.querySelector('button[type="submit"]')
    if (!(createSubmitButton instanceof HTMLButtonElement)) {
      throw new Error('create submit button not found')
    }
    createSubmitButton.click()
    await flushPromises()

    expect(wrapper.text()).toContain('新規タグ')

    await wrapper.find('button[title="編集"]').trigger('click')
    await flushPromises()

    const editNameInput = document.body.querySelector('input[name="name"]')
    if (!(editNameInput instanceof HTMLInputElement)) {
      throw new Error('edit name input not found')
    }
    editNameInput.value = '更新タグ'
    editNameInput.dispatchEvent(new Event('input'))
    const saveButton = document.body.querySelector('button[type="submit"]')
    if (!(saveButton instanceof HTMLButtonElement)) {
      throw new Error('save button not found')
    }
    saveButton.click()
    await flushPromises()
    expect(wrapper.text()).toContain('更新タグ')

    const deleteButton = wrapper.find('button[title="削除"]')
    await deleteButton.trigger('click')
    await flushPromises()
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('本当に「更新タグ」タグを削除しますか？'))
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('全ユーザー公開になります'))
    expect(wrapper.text()).not.toContain('更新タグ')
  })

  it('loads tags without current circle', async () => {
    let tagsWasCalled = false
    server.use(
      http.get('/v1/staff/tags', () => {
        tagsWasCalled = true
        return HttpResponse.json([
          {
            id: 'tag-1',
            name: '飲食',
            createdAt: '2021-06-07T12:42:19+09:00',
            updatedAt: '2021-06-07T12:42:19+09:00'
          }
        ])
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/tags', component: StaffTagsPage }
      ]
    })
    await router.push('/staff/tags')
    await router.isReady()

    const wrapper = mount(StaffTagsPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(tagsWasCalled).toBe(true)
    expect(wrapper.text()).toContain('飲食')
  })
})
