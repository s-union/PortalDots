import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import EmailVerifyActionPage from './[userId].vue'
import EmailVerifyCompletedPage from '../completed.vue'

async function mountAtVerifyAction() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/email/verify/completed', component: EmailVerifyCompletedPage },
      { path: '/email/verify/:type/:userId', component: EmailVerifyActionPage }
    ]
  })

  server.use(
    http.post('/v1/auth/register/verify', () =>
      HttpResponse.json({
        pendingRegistrationId: 'pending-123',
        univemail: '24z9999@example.ac.jp',
        studentId: '24z9999',
        verified: true
      })
    ),
    http.post('/v1/auth/register/complete', () => new HttpResponse(null, { status: 204 }))
  )

  await router.push('/email/verify/univemail/pending-123?token=token-abc')
  await router.isReady()

  const wrapper = mount(EmailVerifyActionPage, {
    global: {
      plugins: [
        pinia,
        router,
        [
          VueQueryPlugin,
          {
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } }
            })
          }
        ]
      ]
    }
  })

  await flushPromises()

  return { wrapper, router }
}

describe('EmailVerifyActionPage', () => {
  it('loads verification info and completes registration', async () => {
    const { wrapper, router } = await mountAtVerifyAction()

    expect(wrapper.text()).toContain('ユーザー登録を続ける')
    expect(wrapper.text()).toContain('24z9999@example.ac.jp')
    expect(wrapper.get('input[name="studentId"]').element).toHaveProperty('value', '24z9999')
    expect(wrapper.text()).not.toContain('ホームへ戻る')

    await wrapper.get('input[name="name"]').setValue('認証 太郎')
    await wrapper.get('input[name="nameYomi"]').setValue('にんしょう たろう')
    await wrapper.get('input[name="phoneNumber"]').setValue('090-1111-1111')
    await wrapper.get('input[name="password"]').setValue('password123')
    await wrapper.get('input[name="passwordConfirmation"]').setValue('password123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/email/verify')
  })

  it('shows real-time validation error for name on input', async () => {
    const { wrapper, router } = await mountAtVerifyAction()

    const nameInput = wrapper.get('input[name="name"]')
    await nameInput.setValue('山田太郎')
    await nameInput.trigger('input')
    await flushPromises()

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.text()).toContain('姓と名の間に半角スペースを入れてください（例: 山田 太郎）')
    expect(router.currentRoute.value.path).toBe('/email/verify/univemail/pending-123')
  })

  it('shows client-side validation error for name without space', async () => {
    const { wrapper, router } = await mountAtVerifyAction()

    const nameInput = wrapper.get('input[name="name"]')
    await nameInput.setValue('山田太郎')
    await nameInput.trigger('blur')
    await flushPromises()

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.text()).toContain('姓と名の間に半角スペースを入れてください（例: 山田 太郎）')
    expect(router.currentRoute.value.path).toBe('/email/verify/univemail/pending-123')
  })

  it('shows client-side validation error for password without alphanumeric', async () => {
    const { wrapper, router } = await mountAtVerifyAction()

    const passwordInput = wrapper.get('input[name="password"]')
    await passwordInput.setValue('onlyletters')
    await passwordInput.trigger('blur')
    await flushPromises()

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.text()).toContain('パスワードには数字を含めてください')
    expect(router.currentRoute.value.path).toBe('/email/verify/univemail/pending-123')
  })

  it('shows client-side validation error for password too short', async () => {
    const { wrapper, router } = await mountAtVerifyAction()

    const passwordInput = wrapper.get('input[name="password"]')
    await passwordInput.setValue('abc1')
    await passwordInput.trigger('blur')
    await flushPromises()

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.text()).toContain('パスワードは8文字以上で入力してください')
    expect(router.currentRoute.value.path).toBe('/email/verify/univemail/pending-123')
  })

  it('prevents form submission when client-side validation fails', async () => {
    const { wrapper, router } = await mountAtVerifyAction()

    // Fill form with invalid data (name without space)
    await wrapper.get('input[name="name"]').setValue('山田太郎')
    await wrapper.get('input[name="nameYomi"]').setValue('やまだ たろう')
    await wrapper.get('input[name="phoneNumber"]').setValue('090-1111-1111')
    await wrapper.get('input[name="password"]').setValue('password123')
    await wrapper.get('input[name="passwordConfirmation"]').setValue('password123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    // Wait for validation
    await new Promise((resolve) => setTimeout(resolve, 350))

    // Should show validation error and stay on the same page
    expect(wrapper.text()).toContain('姓と名の間に半角スペースを入れてください（例: 山田 太郎）')
    expect(router.currentRoute.value.path).toBe('/email/verify/univemail/pending-123')
    expect(wrapper.get('input[name="name"]').exists()).toBe(true)
  })

  it('keeps the registration form visible when completeRegistration returns a validation error', async () => {
    server.use(
      http.post('/v1/auth/register/verify', () =>
        HttpResponse.json({
          pendingRegistrationId: 'pending-123',
          univemail: '24z9999@example.ac.jp',
          studentId: '24z9999',
          verified: true
        })
      ),
      http.post('/v1/auth/register/complete', () =>
        HttpResponse.json(
          {
            message: 'validation_error',
            errors: {
              password: ['パスワードは8文字以上で入力してください']
            }
          },
          { status: 422 }
        )
      )
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/email/verify/completed', component: EmailVerifyCompletedPage },
        { path: '/email/verify/:type/:userId', component: EmailVerifyActionPage }
      ]
    })

    await router.push('/email/verify/univemail/pending-123?token=token-abc')
    await router.isReady()

    const wrapper = mount(EmailVerifyActionPage, {
      global: {
        plugins: [
          pinia,
          router,
          [
            VueQueryPlugin,
            {
              queryClient: new QueryClient({
                defaultOptions: { queries: { retry: false } }
              })
            }
          ]
        ]
      }
    })

    await flushPromises()

    await wrapper.get('input[name="name"]').setValue('認証 太郎')
    await wrapper.get('input[name="nameYomi"]').setValue('にんしょう たろう')
    await wrapper.get('input[name="phoneNumber"]').setValue('090-1111-1111')
    await wrapper.get('input[name="password"]').setValue('short')
    await wrapper.get('input[name="passwordConfirmation"]').setValue('short')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('パスワードは8文字以上で入力してください')
    expect(wrapper.get('input[name="name"]').exists()).toBe(true)
    expect(wrapper.get('input[name="password"]').exists()).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe('/email/verify/univemail/pending-123?token=token-abc')
  })
})
