import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderMarkdownNotice } from '../templates/markdown-notice'
import { renderRegistrationVerify } from '../templates/registration-verify'
import { renderStaffAuthNotice } from '../templates/staff-auth-notice'

const baseVariables = {
  adminName: 'PortalDots 実行委員会',
  appName: 'PortalDots',
  appURL: 'https://example.com',
  authCode: '123456',
  body: '本文です。',
  contactEmail: 'contact@example.com',
  preview: 'プレビュー',
  subject: 'メール認証のお願い',
  verifyURL: 'https://example.com/verify'
}

describe('email templates', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders registration verification without strict-mode warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await renderRegistrationVerify(baseVariables)

    expect(warn).not.toHaveBeenCalled()
  })

  it('renders markdown notices without strict-mode warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await renderMarkdownNotice(baseVariables)

    expect(warn).not.toHaveBeenCalled()
  })

  it('renders staff auth notices without strict-mode warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await renderStaffAuthNotice(baseVariables)

    expect(warn).not.toHaveBeenCalled()
  })
})
