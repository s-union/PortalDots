import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffUserDetailPage from './[userId].vue'

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

describe('StaffUserDetailPage', () => {
  function expectInputValue(wrapper: ReturnType<typeof mount>, selector: string, expected: string) {
    const element = wrapper.get(selector).element
    if (!(element instanceof HTMLInputElement)) {
      throw new Error(`Expected HTMLInputElement for ${selector}`)
    }
    expect(element.value).toBe(expected)
  }

  it('loads and updates user profile, roles, and verification', async () => {
    let updatedRoles = ['participant']
    let displayName = 'Demo User'
    let loginIds = ['demo@example.com', '24a0000']
    let isVerified = false

    server.use(
      http.get('/v1/staff/users/demo-user', () => {
        return HttpResponse.json({
          id: 'demo-user',
          lastName: 'デモ',
          lastNameReading: 'でも',
          firstName: 'ユーザー',
          firstNameReading: 'ゆーざー',
          displayName,
          loginIds,
          contactEmail: 'demo@example.com',
          phoneNumber: '090-0000-0001',
          roles: updatedRoles,
          isVerified,
          isEmailVerified: false
        })
      }),
      http.put('/v1/staff/users/demo-user', () => {
        displayName = 'Updated Demo User'
        loginIds = ['updated@example.com', '24a9999']
        return HttpResponse.json({
          id: 'demo-user',
          lastName: 'デモ',
          lastNameReading: 'でも',
          firstName: 'ユーザー',
          firstNameReading: 'ゆーざー',
          displayName,
          loginIds,
          contactEmail: 'updated@example.com',
          phoneNumber: '090-0000-0001',
          roles: updatedRoles,
          isVerified,
          isEmailVerified: false
        })
      }),
      http.put('/v1/staff/users/demo-user/roles', () => {
        updatedRoles = ['participant', 'forms_manager']
        return HttpResponse.json({
          id: 'demo-user',
          lastName: 'デモ',
          lastNameReading: 'でも',
          firstName: 'ユーザー',
          firstNameReading: 'ゆーざー',
          displayName,
          loginIds,
          contactEmail: 'demo@example.com',
          phoneNumber: '090-0000-0001',
          roles: updatedRoles,
          isVerified,
          isEmailVerified: false
        })
      }),
      http.patch('/v1/staff/users/demo-user/verify', () => {
        isVerified = true
        return HttpResponse.json({
          id: 'demo-user',
          lastName: 'デモ',
          lastNameReading: 'でも',
          firstName: 'ユーザー',
          firstNameReading: 'ゆーざー',
          displayName,
          loginIds,
          contactEmail: 'demo@example.com',
          phoneNumber: '090-0000-0001',
          roles: updatedRoles,
          isVerified,
          isEmailVerified: false
        })
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-b',
        name: 'デモ企画B'
      },
      featureFlags: [],
      roles: ['admin'],
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/users', component: { template: '<div>users</div>' } },
        { path: '/staff/users/:userId', component: StaffUserDetailPage }
      ]
    })
    await router.push('/staff/users/demo-user')
    await router.isReady()

    const wrapper = mount(StaffUserDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expectInputValue(wrapper, 'input[name="displayName"]', 'Demo User')
    expect(wrapper.text()).toContain('参加者')
    expect(wrapper.text()).toContain('本人確認未完了')

    await wrapper.get('input[name="displayName"]').setValue('Updated Demo User')
    await wrapper.get('textarea[name="loginIds"]').setValue('updated@example.com\n24a9999')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('ユーザー情報を更新しました。')
    expectInputValue(wrapper, 'input[name="displayName"]', 'Updated Demo User')

    await wrapper.get('button[type="button"]').trigger('click')
    await vi.waitFor(
      async () => {
        await flushPromises()
        expect(wrapper.text()).toContain('本人確認を完了しました。')
        expect(wrapper.text()).toContain('本人確認済み')
      },
      { timeout: 5000 }
    )

    await wrapper.get('input[name="forms_manager"]').setValue(true)
    await wrapper.findAll('button[type="submit"]')[1]?.trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('ロールを更新しました。')
    expect(wrapper.text()).toContain('申請管理')
  })
})
