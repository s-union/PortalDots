import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import RegisterPage from './register.vue'

enableAutoUnmount(afterEach)

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

async function mountAtRegister() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/register', component: RegisterPage }
    ]
  })

  await router.push('/register')
  await router.isReady()

  const wrapper = mount(RegisterPage, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router, createQueryPlugin()]
    }
  })
  await flushPromises()

  return { wrapper, router }
}

describe('RegisterPage', () => {
  it('starts registration and shows the success guidance', async () => {
    const payloads: unknown[] = []
    server.use(
      http.post('/v1/auth/register/start', async ({ request }) => {
        payloads.push(await request.json())
        return HttpResponse.json({ message: '確認メールを送信しました。' })
      })
    )
    const { wrapper, router } = await mountAtRegister()

    expect(wrapper.text()).toContain('ユーザー登録')
    expect(wrapper.get('input[name="univemailLocalPart"]').exists()).toBe(true)

    await wrapper.get('input[name="univemailLocalPart"]').setValue('24z9999')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('確認メールを送信しました。')
    expect(payloads).toEqual([{ univemailLocalPart: '24z9999' }])
    expect(router.currentRoute.value.fullPath).toBe('/register')
  })

  it('reports an invalid field and focuses it without sending a request', async () => {
    let requests = 0
    server.use(
      http.post('/v1/auth/register/start', () => {
        requests++
        return HttpResponse.json({ message: '確認メールを送信しました。' })
      })
    )
    const { wrapper } = await mountAtRegister()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const input = wrapper.get('input[name="univemailLocalPart"]')
    expect(requests).toBe(0)
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe('register-email-helper register-email-error')
    expect(wrapper.get('#register-email-error').text()).toBe('大学メールアドレスを入力してください')
    expect(document.activeElement).toBe(input.element)
  })

  it('prevents duplicate submissions and retains edits for a retry after a failed request', async () => {
    const pending = Promise.withResolvers<Response>()
    const payloads: unknown[] = []
    server.use(
      http.post('/v1/auth/register/start', async ({ request }) => {
        payloads.push(await request.json())
        return payloads.length === 1 ? pending.promise : HttpResponse.json({ message: '確認メールを送信しました。' })
      })
    )
    const { wrapper } = await mountAtRegister()
    await wrapper.get('input[name="univemailLocalPart"]').setValue('24z9999')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(payloads).toHaveLength(1))
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)
    await wrapper.get('input[name="univemailLocalPart"]').setValue('24z8888')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(payloads).toEqual([{ univemailLocalPart: '24z9999' }])
    pending.resolve(
      HttpResponse.json(
        { message: 'Validation failed', errors: { univemailLocalPart: ['メールの送信に失敗しました。'] } },
        { status: 422 }
      )
    )
    await vi.waitFor(() => expect(wrapper.text()).toContain('メールの送信に失敗しました。'))
    expect(wrapper.get<HTMLInputElement>('input[name="univemailLocalPart"]').element.value).toBe('24z8888')
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(payloads).toEqual([{ univemailLocalPart: '24z9999' }, { univemailLocalPart: '24z8888' }])
    expect(wrapper.text()).toContain('確認メールを送信しました。')
    expect(wrapper.text()).not.toContain('メールの送信に失敗しました。')
  })
})
