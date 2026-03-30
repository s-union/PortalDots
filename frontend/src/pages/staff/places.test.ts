import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffPlacesPage from './places.vue'

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

describe('StaffPlacesPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('lists, creates, updates, and deletes places', async () => {
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

    const places = [
      { id: 'place-2', name: '中庭', type: 2, notes: '屋外' },
      { id: 'place-1', name: '1号館', type: 1, notes: '屋内' }
    ]

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/places', component: StaffPlacesPage }
      ]
    })
    await router.push('/staff/places')
    await router.isReady()

    const confirmMock = vi.fn(() => true)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)

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
        if (pathname.endsWith('/staff/places') && method === 'GET') {
          return new Response(JSON.stringify(places), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (pathname.endsWith('/staff/places') && method === 'POST') {
          places.push({ id: 'place-3', name: '体育館', type: 3, notes: '特殊' })
          return new Response(JSON.stringify(places[2]), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (pathname.endsWith('/staff/places/place-1') && method === 'PUT') {
          places[1] = { id: 'place-1', name: '更新後 1号館', type: 1, notes: '更新' }
          return new Response(JSON.stringify(places[1]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (pathname.endsWith('/staff/places/place-2') && method === 'DELETE') {
          places.splice(0, 1)
          return new Response(null, { status: 204 })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffPlacesPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.get('a[href$="/v1/staff/places/export"]').text()).toContain('CSVで出力(場所別企画一覧)')
    expect(wrapper.text()).toContain('1号館')
    expect(wrapper.text()).toContain('中庭')
    expect(wrapper.text()).not.toContain('場所ID')
    expect(wrapper.text()).not.toContain('place-1')
    expect(wrapper.text()).not.toContain('place-2')
    expect(wrapper.text().indexOf('1号館')).toBeLessThan(wrapper.text().indexOf('中庭'))

    const createButton = wrapper.findAll('button[type="button"]').find((button) => button.text().includes('新規場所'))
    if (!createButton) {
      throw new Error('create button not found')
    }
    await createButton.trigger('click')
    await flushPromises()

    const createNameInput = document.body.querySelector('input[name="name"]')
    if (!(createNameInput instanceof HTMLInputElement)) {
      throw new Error('create name input not found')
    }
    createNameInput.value = '体育館'
    createNameInput.dispatchEvent(new Event('input'))

    const createTypeSelect = document.body.querySelector('select[name="type"]')
    if (!(createTypeSelect instanceof HTMLSelectElement)) {
      throw new Error('create type select not found')
    }
    createTypeSelect.value = '3'
    createTypeSelect.dispatchEvent(new Event('change'))

    const createNotesTextarea = document.body.querySelector('textarea[name="notes"]')
    if (!(createNotesTextarea instanceof HTMLTextAreaElement)) {
      throw new Error('create notes textarea not found')
    }
    createNotesTextarea.value = '特殊'
    createNotesTextarea.dispatchEvent(new Event('input'))

    const createSubmitButton = document.body.querySelector('button[type="submit"]')
    if (!(createSubmitButton instanceof HTMLButtonElement)) {
      throw new Error('create submit button not found')
    }
    createSubmitButton.click()
    await flushPromises()
    expect(wrapper.text()).toContain('体育館')

    const editButtons = wrapper.findAll('button[type="button"]').filter((button) => button.text().includes('編集'))
    await editButtons[0]?.trigger('click')
    await flushPromises()

    const editNameInput = document.body.querySelector('input[name="name"]')
    if (!(editNameInput instanceof HTMLInputElement)) {
      throw new Error('edit name input not found')
    }
    editNameInput.value = '更新後 1号館'
    editNameInput.dispatchEvent(new Event('input'))

    const editNotesTextarea = document.body.querySelector('textarea[name="notes"]')
    if (!(editNotesTextarea instanceof HTMLTextAreaElement)) {
      throw new Error('edit notes textarea not found')
    }
    editNotesTextarea.value = '更新'
    editNotesTextarea.dispatchEvent(new Event('input'))

    const saveButton = document.body.querySelector('button[type="submit"]')
    if (!(saveButton instanceof HTMLButtonElement)) {
      throw new Error('save button not found')
    }
    saveButton.click()
    await flushPromises()
    expect(wrapper.text()).toContain('更新後 1号館')

    const reopenEditButtons = wrapper
      .findAll('button[type="button"]')
      .filter((button) => button.text().includes('編集'))
    await reopenEditButtons[1]?.trigger('click')
    await flushPromises()

    const deleteButton = Array.from(document.body.querySelectorAll('button[type="button"]')).find((button) =>
      button.textContent?.includes('削除')
    )
    if (!(deleteButton instanceof HTMLButtonElement)) {
      throw new Error('delete button not found')
    }
    deleteButton.click()
    await flushPromises()
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('場所「中庭」を削除しますか？'))
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('企画自体は削除されません'))
    expect(wrapper.text()).not.toContain('中庭')
    expect(wrapper.findAll('button[class*="border-danger"]').length).toBe(0)
  })

  it('does not delete when place deletion is cancelled', async () => {
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
        { path: '/staff/places', component: StaffPlacesPage }
      ]
    })
    await router.push('/staff/places')
    await router.isReady()

    const confirmMock = vi.fn(() => false)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)

    const deleteRequests: string[] = []
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
        if (pathname.endsWith('/staff/places') && method === 'GET') {
          return new Response(
            JSON.stringify([
              { id: 'place-1', name: '1号館', type: 1, notes: '屋内' },
              { id: 'place-2', name: '中庭', type: 2, notes: '屋外' }
            ]),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
        if (pathname.endsWith('/staff/places/place-2') && method === 'DELETE') {
          deleteRequests.push(url)
          return new Response(null, { status: 204 })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffPlacesPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    const editButtons = wrapper.findAll('button[type="button"]').filter((button) => button.text().includes('編集'))
    await editButtons[1]?.trigger('click')
    await flushPromises()

    const deleteButton = Array.from(document.body.querySelectorAll('button[type="button"]')).find((button) =>
      button.textContent?.includes('削除')
    )
    if (!(deleteButton instanceof HTMLButtonElement)) {
      throw new Error('delete button not found')
    }
    deleteButton.click()
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('場所「中庭」を削除しますか？'))
    expect(deleteRequests).toHaveLength(0)
    expect(wrapper.text()).toContain('中庭')
  })

  it('loads places without current circle', async () => {
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
        { path: '/staff/places', component: StaffPlacesPage }
      ]
    })
    await router.push('/staff/places')
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
      if (pathname.endsWith('/staff/places') && method === 'GET') {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 'place-1', name: '1号館', type: 1, notes: '屋内' }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
      }

      return Promise.reject(new Error(`Unexpected request: ${method} ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(StaffPlacesPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(
      fetchMock.mock.calls.some(([input]) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        return new URL(url, 'http://localhost').pathname.endsWith('/staff/places')
      })
    ).toBe(true)
    expect(wrapper.text()).toContain('1号館')
  })
})
