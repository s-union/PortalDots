import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import PasswordResetSignedPage from './[userId].vue'

function createQueryPlugin() {
  return [
    VueQueryPlugin,
    {
      queryClient: new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      })
    }
  ]
}

async function mountAtSignedReset() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/password/reset', component: { template: '<div>reset</div>' } },
      { path: '/password/reset/:userId', component: PasswordResetSignedPage }
    ]
  })

  await router.push('/password/reset/user-123?token=test-token')
  await router.isReady()

  return mount(PasswordResetSignedPage, {
    global: {
      plugins: [router, createQueryPlugin()]
    }
  })
}

describe('PasswordResetSignedPage', () => {
  it('shows password reset form when token is valid', async () => {
    const wrapper = await mountAtSignedReset()
    await vi.waitFor(() => {
      expect(wrapper.find('input[name="password"]').exists()).toBe(true)
    })

    expect(wrapper.text()).toContain('パスワードの再設定')
    expect(wrapper.get('input[name="password"]').exists()).toBe(true)
    expect(wrapper.get('input[name="passwordConfirmation"]').exists()).toBe(true)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('新しいパスワードを設定')
    })
  })
})
