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
    usersApiMocks.buildStaffUsersExportUrl.mockReturnValue('http://localhost/v1/staff/users/export')
    usersApiMocks.useStaffUsersQuery.mockReturnValue({
      data: ref({
        items: [
          {
            id: 'staff-user',
            lastName: 'デモ',
            lastNameReading: 'でも',
            firstName: 'スタッフ',
            firstNameReading: 'すたっふ',
            displayName: 'デモ スタッフ',
            loginIds: ['DEMO-STAFF'],
            contactEmail: 'demo-staff@portaldots.com',
            phoneNumber: '090-0000-0001',
            roles: ['admin'],
            isVerified: true,
            isEmailVerified: true
          },
          {
            id: 'demo-user',
            lastName: 'デモ',
            lastNameReading: 'でも',
            firstName: '企画者',
            firstNameReading: 'きかくしゃ',
            displayName: 'デモ 企画者',
            loginIds: ['DEMO-CIRCLE'],
            contactEmail: 'demo-circle@portaldots.com',
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

    expect(wrapper.text()).toContain('DEMO-STAFF')
    expect(wrapper.text()).toContain('DEMO-CIRCLE')
    expect(wrapper.text()).toContain('でも')
    expect(wrapper.text()).toContain('demo-staff@portaldots.com')
    expect(wrapper.text()).toContain('確認済み')
    expect(wrapper.text()).toContain('未確認')
    expect(wrapper.text()).toContain('表示件数:')
    expect(wrapper.text()).toContain('全2件')
    expect(wrapper.text()).toContain('絞り込み')
    expect(wrapper.get('a[href$="/v1/staff/users/export"]').text()).toContain('CSVで出力')

    const sortButton = wrapper.findAll('thead button').find((button) => button.text().includes('姓'))
    if (!sortButton) {
      throw new Error('expected lastName sort button')
    }
    await sortButton.trigger('click')
    const sortArgAfterHeaderClick = usersApiMocks.useStaffUsersQuery.mock.calls.at(-1)?.[1]
    if (!sortArgAfterHeaderClick) {
      throw new Error('expected sort argument')
    }
    expect(sortArgAfterHeaderClick.value.sortKey).toBe('lastName')
    expect(sortArgAfterHeaderClick.value.sortDirection).toBe('asc')

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
    usersApiMocks.buildStaffUsersExportUrl.mockReturnValue('http://localhost/v1/staff/users/export')
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
