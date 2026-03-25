import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import StaffUsersIndexPage from './index.vue'

const statusApiMocks = vi.hoisted(() => ({
  useStaffStatusQuery: vi.fn()
}))

const usersApiMocks = vi.hoisted(() => ({
  useStaffUsersQuery: vi.fn(),
  buildStaffUsersExportUrl: vi.fn()
}))

vi.mock('@/features/staff/status/api', () => ({
  useStaffStatusQuery: statusApiMocks.useStaffStatusQuery
}))

vi.mock('@/features/staff/users/api', () => ({
  useStaffUsersQuery: usersApiMocks.useStaffUsersQuery,
  buildStaffUsersExportUrl: usersApiMocks.buildStaffUsersExportUrl
}))

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

describe('StaffUsersIndexPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists staff-manageable users', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    statusApiMocks.useStaffStatusQuery.mockReturnValue({
      data: ref({ allowed: true, authorized: true })
    })
    usersApiMocks.buildStaffUsersExportUrl.mockReturnValue('http://127.0.0.1:8080/v1/staff/users/export')
    usersApiMocks.useStaffUsersQuery.mockReturnValue({
      data: ref({
        items: [
          {
            id: 'staff-user',
            lastName: 'スタッフ',
            lastNameReading: 'すたっふ',
            firstName: 'ユーザー',
            firstNameReading: 'ゆーざー',
            displayName: 'Staff User',
            loginIds: ['staff@example.com'],
            contactEmail: 'staff@example.com',
            phoneNumber: '090-0000-0001',
            roles: ['admin'],
            isVerified: true,
            isEmailVerified: true
          },
          {
            id: 'demo-user',
            lastName: 'デモ',
            lastNameReading: 'でも',
            firstName: 'ユーザー',
            firstNameReading: 'ゆーざー',
            displayName: 'Demo User',
            loginIds: ['demo@example.com', '24a0000'],
            contactEmail: 'demo@example.com',
            phoneNumber: '',
            roles: ['participant'],
            isVerified: false,
            isEmailVerified: false
          }
        ],
        page: 1,
        pageSize: 10,
        total: 2
      }),
      isPending: ref(false)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/users', component: StaffUsersIndexPage },
        { path: '/staff/users/:userId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/staff/users')
    await router.isReady()

    const wrapper = mount(StaffUsersIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('staff-user')
    expect(wrapper.text()).toContain('demo-user')
    expect(wrapper.text()).toContain('staff@example.com')
    expect(wrapper.text()).toContain('確認済み')
    expect(wrapper.text()).toContain('未確認')
    expect(wrapper.text()).toContain('表示件数:')
    expect(wrapper.text()).toContain('全2件')
    expect(wrapper.text()).toContain('絞り込み')
    expect(wrapper.get('a[href="http://127.0.0.1:8080/v1/staff/users/export"]').text()).toContain('CSVで出力')

    await wrapper.get('thead button').trigger('click')
    expect(wrapper.text()).toContain('demo-user')

    await wrapper.get('select').setValue('50')
    await flushPromises()
    expect(usersApiMocks.useStaffUsersQuery).toHaveBeenCalled()

    const paginationArg = usersApiMocks.useStaffUsersQuery.mock.calls.at(-1)?.[1]
    if (!paginationArg) {
      throw new Error('expected pagination argument')
    }
    const resolvedPagination = paginationArg.value
    expect(typeof resolvedPagination.sortKey).toBe('string')
    expect(typeof resolvedPagination.sortDirection).toBe('string')
    expect(Array.isArray(resolvedPagination.queries)).toBe(true)
    expect(resolvedPagination.mode).toBe('and')
  })

  it('opens filter drawer and applies filters', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    statusApiMocks.useStaffStatusQuery.mockReturnValue({
      data: ref({ allowed: true, authorized: true })
    })
    usersApiMocks.buildStaffUsersExportUrl.mockReturnValue('http://127.0.0.1:8080/v1/staff/users/export')
    usersApiMocks.useStaffUsersQuery.mockReturnValue({
      data: ref({
        items: [],
        page: 1,
        pageSize: 25,
        total: 0
      }),
      isPending: ref(false)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/users', component: StaffUsersIndexPage },
        { path: '/staff/users/:userId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/staff/users')
    await router.isReady()

    const wrapper = mount(StaffUsersIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()],
        stubs: {
          teleport: true
        }
      }
    })
    await flushPromises()

    await wrapper.get('button[title="絞り込み"]').trigger('click')

    const addFilterSelect = wrapper
      .findAll('select')
      .find((select) => select.find('option[value="isVerified"]').exists())
    if (!addFilterSelect) {
      throw new Error('expected filter field selector')
    }
    await addFilterSelect.setValue('isVerified')

    const applyButton = wrapper.findAll('button').find((button) => button.text().includes('適用'))
    if (!applyButton) {
      throw new Error('expected apply button')
    }
    await applyButton.trigger('click')

    const paginationArg = usersApiMocks.useStaffUsersQuery.mock.calls.at(-1)?.[1]
    if (!paginationArg) {
      throw new Error('expected pagination argument')
    }
    const resolvedPagination = paginationArg.value
    expect(resolvedPagination.queries).toEqual([{ keyName: 'isVerified', operator: '=', value: 'true' }])
    expect(resolvedPagination.mode).toBe('and')
  })
})
