import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists, creates, updates, and deletes tags', async () => {
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

    const tags = [
      { id: 'tag-2', name: '展示' },
      { id: 'tag-1', name: '飲食' }
    ]

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

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return new Response(JSON.stringify({ allowed: true, authorized: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (pathname.endsWith('/staff/tags') && method === 'GET') {
          return new Response(JSON.stringify(tags), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (pathname.endsWith('/staff/tags') && method === 'POST') {
          tags.push({ id: 'tag-3', name: '新規タグ' })
          return new Response(JSON.stringify(tags[2]), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (pathname.endsWith('/staff/tags/tag-1') && method === 'PUT') {
          const targetIndex = tags.findIndex((tag) => tag.id === 'tag-1')
          tags[targetIndex] = { id: 'tag-1', name: '更新タグ' }
          return new Response(JSON.stringify(tags[targetIndex]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (pathname.endsWith('/staff/tags/tag-1') && method === 'DELETE') {
          tags.splice(
            tags.findIndex((tag) => tag.id === 'tag-1'),
            1
          )
          return new Response(null, { status: 204 })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffTagsPage, {
      attachTo: document.body,
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('飲食')
    expect(wrapper.text()).not.toContain('タグID')
    expect(wrapper.text().indexOf('飲食')).toBeLessThan(wrapper.text().indexOf('展示'))
    expect(wrapper.get('a[href$="/staff/tags/export"]').text()).toContain('CSVで出力')

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

    const editButtons = wrapper.findAll('button[type="button"]').filter((button) => button.text().includes('編集'))
    await editButtons[0]?.trigger('click')
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

    const reopenEditButtons = wrapper
      .findAll('button[type="button"]')
      .filter((button) => button.text().includes('編集'))
    await reopenEditButtons[0]?.trigger('click')
    await flushPromises()

    const deleteButton = Array.from(document.body.querySelectorAll('button[type="button"]')).find((button) =>
      button.textContent?.includes('削除')
    )
    if (!(deleteButton instanceof HTMLButtonElement)) {
      throw new Error('delete button not found')
    }
    deleteButton.click()
    await flushPromises()
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('本当に「更新タグ」タグを削除しますか？'))
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('全ユーザー公開になります'))
    expect(wrapper.findAll('button[class*="border-danger"]').length).toBe(0)
  })

  it('loads tags without current circle', async () => {
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

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
      const pathname = new URL(url, 'http://localhost').pathname

      if (pathname.endsWith('/staff/status') && method === 'GET') {
        return Promise.resolve(
          new Response(JSON.stringify({ allowed: true, authorized: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
      }
      if (pathname.endsWith('/staff/tags') && method === 'GET') {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 'tag-1', name: '飲食' }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
      }

      return Promise.reject(new Error(`Unexpected request: ${method} ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(StaffTagsPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(
      fetchMock.mock.calls.some(([input]) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        return new URL(url, 'http://localhost').pathname.endsWith('/staff/tags')
      })
    ).toBe(true)
    expect(wrapper.text()).toContain('飲食')
  })
})
