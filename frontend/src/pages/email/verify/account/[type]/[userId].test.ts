import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

const authApiMocks = vi.hoisted(() => ({
  useVerifyAuthVerificationLinkMutation: vi.fn(),
  extractFirstErrorMessage: vi.fn()
}))

vi.mock('@/features/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/api')>('@/features/auth/api')

  return {
    ...actual,
    useVerifyAuthVerificationLinkMutation: authApiMocks.useVerifyAuthVerificationLinkMutation,
    extractFirstErrorMessage: authApiMocks.extractFirstErrorMessage
  }
})

import EmailVerifyAccountPage from './[userId].vue'

async function mountAtVerifyAccount(mutateAsync: ReturnType<typeof vi.fn>) {
  const pinia = createPinia()
  setActivePinia(pinia)

  authApiMocks.useVerifyAuthVerificationLinkMutation.mockReturnValue({
    mutateAsync,
    isPending: ref(false)
  })
  authApiMocks.extractFirstErrorMessage.mockImplementation(() => 'エラーが発生しました')

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/email/verify/account/:type/:userId', component: EmailVerifyAccountPage }]
  })

  await router.push('/email/verify/account/email/user-123?token=token-abc')
  await router.isReady()

  const wrapper = mount(EmailVerifyAccountPage, {
    global: {
      plugins: [pinia, router]
    }
  })
  await flushPromises()

  return { wrapper }
}

describe('EmailVerifyAccountPage', () => {
  it('verifies the auth verification link and shows next guidance', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ completed: false })
    const { wrapper } = await mountAtVerifyAccount(mutateAsync)

    expect(mutateAsync).toHaveBeenCalledWith({
      type: 'email',
      userId: 'user-123',
      token: 'token-abc'
    })
    expect(wrapper.text()).toContain(
      'メール認証が完了しました。大学メールアドレスを認証すると、企画参加登録を進められます。'
    )
    expect(wrapper.get('a[href="/email/verify"]').text()).toContain('認証状況を確認する')
  })

  it('shows an extracted error message when verification fails', async () => {
    const mutateAsync = vi.fn().mockRejectedValueOnce(new Error('verify failed'))
    const { wrapper } = await mountAtVerifyAccount(mutateAsync)

    expect(wrapper.text()).toContain('エラーが発生しました')
  })
})
