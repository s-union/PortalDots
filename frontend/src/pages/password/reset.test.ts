import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import PasswordResetPage from './reset.vue'

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

async function mountAtPasswordReset() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/password/reset', component: PasswordResetPage }
    ]
  })

  await router.push('/password/reset')
  await router.isReady()

  return mount(PasswordResetPage, {
    global: {
      plugins: [router, createQueryPlugin()]
    }
  })
}

describe('PasswordResetPage', () => {
  it('shows reset heading and request form', async () => {
    const wrapper = await mountAtPasswordReset()

    expect(wrapper.text()).toContain('パスワードの再設定')
    expect(wrapper.text()).toContain('学籍番号または連絡先メールアドレス')
    expect(wrapper.get('input[name="loginId"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('再設定のためのメールを送信')
  })
})
