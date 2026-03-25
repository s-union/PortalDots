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
            displayName: 'Staff User',
            loginIds: ['staff@example.com'],
            roles: ['admin'],
            isVerified: true
          },
          {
            id: 'demo-user',
            displayName: 'Demo User',
            loginIds: ['demo@example.com', '24a0000'],
            roles: ['participant'],
            isVerified: false
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

    expect(wrapper.text()).toContain('Staff User')
    expect(wrapper.text()).toContain('Demo User')
    expect(wrapper.text()).toContain('staff@example.com')
    expect(wrapper.text()).toContain('participant')
    expect(wrapper.text()).toContain('確認済み')
    expect(wrapper.text()).toContain('未確認')
    expect(wrapper.text()).toContain('表示件数:')
    expect(wrapper.text()).toContain('全2件')
    expect(wrapper.get('a[href="http://127.0.0.1:8080/v1/staff/users/export"]').text()).toContain('CSVで出力')

    await wrapper.get('thead button').trigger('click')
    expect(wrapper.text()).toContain('Demo User')

    await wrapper.get('select').setValue('50')
    await flushPromises()
    expect(usersApiMocks.useStaffUsersQuery).toHaveBeenCalled()
  })
})
