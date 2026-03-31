import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PasswordResetSignedPage from './[userId].vue'

async function mountAtSignedReset() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/password/reset', component: { template: '<div>reset</div>' } },
      { path: '/password/reset/:userId', component: PasswordResetSignedPage }
    ]
  })

  await router.push('/password/reset/user-123')
  await router.isReady()

  return mount(PasswordResetSignedPage, {
    global: {
      plugins: [router]
    }
  })
}

describe('PasswordResetSignedPage', () => {
  it('shows signed reset placeholder and fallback action', async () => {
    const wrapper = await mountAtSignedReset()

    expect(wrapper.text()).toContain('パスワードの再設定')
    expect(wrapper.text()).toContain('このリンクからのパスワード再設定は利用できません。')
    expect(wrapper.get('a[href="/password/reset"]').text()).toContain('再設定方法の案内を見る')
  })
})
