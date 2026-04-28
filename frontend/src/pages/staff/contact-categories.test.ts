import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffContactCategoriesPage from './contact-categories.vue'

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

describe('StaffContactCategoriesPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists, creates, updates, and deletes contact categories', async () => {
    const categories = [
      { id: 'category-1', name: '総合', email: 'general@example.com' },
      { id: 'category-2', name: '安全', email: 'safety@example.com' }
    ]

    server.use(
      http.get('/v1/staff/contact-categories', () => HttpResponse.json(categories)),
      http.post('/v1/staff/contact-categories', () => {
        categories.push({ id: 'category-3', name: '新規', email: 'new@example.com' })
        return HttpResponse.json(categories[2], { status: 201 })
      }),
      http.put('/v1/staff/contact-categories/category-1', () => {
        categories[0] = { id: 'category-1', name: '更新総合', email: 'updated@example.com' }
        return HttpResponse.json(categories[0])
      }),
      http.delete('/v1/staff/contact-categories/category-2', () => {
        categories.splice(1, 1)
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
        { path: '/staff/contact-categories', component: StaffContactCategoriesPage }
      ]
    })
    await router.push('/staff/contact-categories')
    await router.isReady()

    const confirmMock = vi.fn(() => true)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)

    const wrapper = mount(StaffContactCategoriesPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('総合')
    expect(wrapper.text()).toContain('メールアドレスを追加')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    const createNameInput = document.body.querySelector('input[name="name"]')
    if (!(createNameInput instanceof HTMLInputElement)) {
      throw new Error('create name input not found')
    }
    createNameInput.value = '新規'
    createNameInput.dispatchEvent(new Event('input'))

    const createEmailInput = document.body.querySelector('input[name="email"]')
    if (!(createEmailInput instanceof HTMLInputElement)) {
      throw new Error('create email input not found')
    }
    createEmailInput.value = 'new@example.com'
    createEmailInput.dispatchEvent(new Event('input'))

    const createSubmitButton = document.body.querySelector('button[type="submit"]')
    if (!(createSubmitButton instanceof HTMLButtonElement)) {
      throw new Error('create submit button not found')
    }
    createSubmitButton.click()
    await flushPromises()
    expect(wrapper.text()).toContain('new@example.com')

    await wrapper.findAll('button[type="button"]')[1]?.trigger('click')
    await flushPromises()

    const editEmailInput = document.body.querySelector('input[name="email"]')
    if (!(editEmailInput instanceof HTMLInputElement)) {
      throw new Error('edit email input not found')
    }
    editEmailInput.value = 'updated@example.com'
    editEmailInput.dispatchEvent(new Event('input'))

    const editNameInput = document.body.querySelector('input[name="name"]')
    if (!(editNameInput instanceof HTMLInputElement)) {
      throw new Error('edit name input not found')
    }
    editNameInput.value = '更新総合'
    editNameInput.dispatchEvent(new Event('input'))

    const saveButton = document.body.querySelector('button[type="submit"]')
    if (!(saveButton instanceof HTMLButtonElement)) {
      throw new Error('save button not found')
    }
    saveButton.click()
    await flushPromises()

    expect(wrapper.text()).toContain('更新総合')

    await wrapper.findAll('button[type="button"]')[2]?.trigger('click')
    await flushPromises()

    const deleteButton = Array.from(document.body.querySelectorAll('button[type="button"]')).find((button) =>
      button.textContent?.includes('削除')
    )
    if (!(deleteButton instanceof HTMLButtonElement)) {
      throw new Error('delete button not found')
    }
    deleteButton.click()
    await flushPromises()
    expect(confirmMock).toHaveBeenCalledWith('安全(safety@example.com)を削除しますか？')
    expect(wrapper.text()).not.toContain('安全')
  })

  it('does not delete contact categories when confirmation is cancelled', async () => {
    server.use(
      http.get('/v1/staff/contact-categories', () =>
        HttpResponse.json([
          { id: 'category-1', name: '総合', email: 'general@example.com' },
          { id: 'category-2', name: '安全', email: 'safety@example.com' }
        ])
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
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/contact-categories', component: StaffContactCategoriesPage }
      ]
    })
    await router.push('/staff/contact-categories')
    await router.isReady()

    const confirmMock = vi.fn(() => false)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)

    let deleteWasCalled = false
    server.use(
      http.delete('/v1/staff/contact-categories/category-2', () => {
        deleteWasCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )

    const wrapper = mount(StaffContactCategoriesPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    await wrapper.findAll('button[type="button"]')[2]?.trigger('click')
    await flushPromises()

    const deleteButton = Array.from(document.body.querySelectorAll('button[type="button"]')).find((button) =>
      button.textContent?.includes('削除')
    )
    if (!(deleteButton instanceof HTMLButtonElement)) {
      throw new Error('delete button not found')
    }
    deleteButton.click()
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith('安全(safety@example.com)を削除しますか？')
    expect(deleteWasCalled).toBe(false)
    expect(wrapper.text()).toContain('安全')
  })

  it('loads contact categories without current circle', async () => {
    let categoriesWasCalled = false
    server.use(
      http.get('/v1/staff/contact-categories', () => {
        categoriesWasCalled = true
        return HttpResponse.json([{ id: 'category-1', name: '総合', email: 'general@example.com' }])
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
        { path: '/staff/contact-categories', component: StaffContactCategoriesPage }
      ]
    })
    await router.push('/staff/contact-categories')
    await router.isReady()

    const wrapper = mount(StaffContactCategoriesPage, {
      global: { plugins: [pinia, router, createQueryPlugin()] }
    })
    await flushPromises()

    expect(categoriesWasCalled).toBe(true)
    expect(wrapper.text()).toContain('総合')
  })
})
