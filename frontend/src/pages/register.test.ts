import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import RegisterPage from './register.vue'

async function mountAtRegister() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/register', component: RegisterPage }
    ]
  })

  await router.push('/register')
  await router.isReady()

  return mount(RegisterPage, {
    global: {
      plugins: [router]
    }
  })
}

describe('RegisterPage', () => {
  it('shows registration heading and login CTA', async () => {
    const wrapper = await mountAtRegister()

    expect(wrapper.text()).toContain('ユーザー登録')
    expect(wrapper.text()).toContain('旧Laravelの登録フォームは未移植')
    expect(wrapper.get('a[href="/login"]').text()).toContain('ログイン画面へ')
  })
})
