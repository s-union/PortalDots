import { describe, expect, it } from 'vitest'
import { renderMarkdownNotice } from '../templates/markdown-notice'
import { renderRegistrationVerify } from '../templates/registration-verify'
import { renderStaffAuthNotice } from '../templates/staff-auth-notice'

const baseVariables = {
  adminName: 'PortalDots 実行委員会',
  appName: 'PortalDots',
  appURL: 'https://example.com',
  authCode: '123456',
  body: '# 本文見出し\n\n本文です。',
  contactEmail: 'contact@example.com',
  preview: 'プレビュー',
  subject: 'お知らせ',
  verifyURL: 'https://example.com/verify'
}

// The `target="_blank"` attribute that hono-email's `LinkButton` component sets
// by default is flagged by strict-mode validation as unsupported in HTML email
// clients (https://www.caniemail.com/features/html-target/). This is expected,
// inherent to the library's `LinkButton` component, and unrelated to our own
// markup.
const knownLinkTargetWarning =
  "The 'target' attribute isn't supported in HTML email strict mode. See: https://www.caniemail.com/features/html-target/"

// `LinkButton` also emits a hidden Outlook-only `<i hidden>` spacer for its
// border-trick padding emulation, which the same strict-mode validator flags.
// Also expected and inherent to the library's `LinkButton` component.
const knownButtonHiddenWarning =
  "The 'hidden' attribute isn't supported in HTML email strict mode. See: https://www.caniemail.com/features/html-hidden/"

// Signature chrome shared by every template: the wordmark's brand-blue full
// stop, the three-dot heading ornament, and the "Powered by PortalDots." credit.
const wordmarkLink =
  '<a href="https://example.com" style="color:#22292f;font-size:18px;font-weight:700;letter-spacing:-0.2px;text-decoration:none">PortalDots<span style="color:#0a65db">.</span></a>'
const headingDot = 'border-radius:3px;display:inline-block;height:6px'
const poweredBy =
  'Powered by <a href="https://www.portaldots.com" style="color:#586169;font-weight:700;text-decoration:none">PortalDots<span style="color:#0a65db">.</span></a>'

describe('email templates', () => {
  describe('registration-verify', () => {
    it('renders the wordmark, card, eyebrow, button, fallback URL, and footer', async () => {
      const { html, text, warnings } = await renderRegistrationVerify({ ...baseVariables, userName: '山田 太郎' })

      expect(warnings).toEqual([knownLinkTargetWarning, knownButtonHiddenWarning])

      // Wordmark: app name closed by the brand-blue full stop, linked to the app.
      expect(html).toContain(wordmarkLink)

      // Card: 570px white box under the gradient accent strip (solid brand
      // background-color as the Outlook fallback).
      expect(html).toContain('width="570px"')
      expect(html).toContain(
        'background-color:#0a65db;background-image:linear-gradient(90deg, #0a65db 0%, #7fabe9 70%, #c9dcf7 100%);border-radius:16px 16px 0 0'
      )
      expect(html).toContain(
        'background-color:#ffffff;border:1px solid #d7dee4;padding:40px;border-radius:0 0 16px 16px'
      )

      // Eyebrow and hardcoded heading (not the dynamic subject) with the
      // three-dot ornament, plus the salutation.
      expect(html).toContain('letter-spacing:2.5px')
      expect(html).toContain('ユーザー登録')
      expect(html).toContain(
        '<h1 style="color:#22292f;font-size:24px;font-weight:bold;letter-spacing:-0.5px;line-height:1.4;margin:0 0 14px;text-align:left">メール認証のお願い</h1>'
      )
      expect(html).toContain(headingDot)
      expect(html).toContain('山田 太郎 様')

      // Primary button.
      expect(html).toContain(
        'background-color:#0a65db;border-radius:10px;color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:0.2px;padding:14px 44px'
      )
      expect(html).toContain('>認証する（ログイン不要）<')

      // Fallback raw URL in the mono wash box under a dotted rule.
      expect(html).toContain('border-top:1px dotted #7fabe9;margin-top:4px')
      expect(html).toContain('background-color:#f0f5fc;border-radius:10px;padding:14px 16px')
      expect(html).toContain('https://example.com/verify')
      expect(html).toContain('SF Mono')

      // Footnote behind its own dotted rule.
      expect(html).toContain('border-top:1px dotted #7fabe9;margin-top:32px')
      expect(html).toContain('本メールに心当たりがない場合、そのままメールを破棄してください。')

      // Shared footer.
      expect(html).toContain('<span style="font-weight:600">PortalDots 実行委員会</span>')
      expect(html).toContain('mailto:contact@example.com')
      expect(html).toContain(poweredBy)

      // The heading ornament is pure decoration and must not leak into the
      // derived plain-text version.
      expect(text).not.toContain('●')
    })

    it('omits the salutation when userName is absent, matching the backend variable contract', async () => {
      const { html } = await renderRegistrationVerify(baseVariables)

      expect(html).not.toContain(' 様')
    })
  })

  describe('markdown-notice', () => {
    it('uses the dynamic subject as the heading and renders the shared chrome', async () => {
      const { html, warnings } = await renderMarkdownNotice(baseVariables)

      expect(warnings).toEqual([])
      expect(html).toContain(
        '<h1 style="color:#22292f;font-size:24px;font-weight:bold;letter-spacing:-0.5px;line-height:1.4;margin:0 0 14px;text-align:left">お知らせ</h1>'
      )
      expect(html).toContain(headingDot)
      expect(html).toContain('color:#22292f;font-size:15px;line-height:1.8') // Markdown container
      expect(html).toContain(poweredBy)
    })

    it('scales markdown headings below the 24px card heading', async () => {
      const { html } = await renderMarkdownNotice(baseVariables)

      expect(html).toContain('margin-top:0;margin-bottom:16px;font-size:20px;line-height:28px') // Markdown h1
    })

    it('renders markdown bullet and ordered lists with Tailwind-derived inline styles', async () => {
      const { html, warnings } = await renderMarkdownNotice({
        ...baseVariables,
        body: '- 項目1\n- 項目2\n\n1. 手順1\n2. 手順2'
      })

      expect(warnings).toEqual([])
      expect(html).toContain('margin-top:0;margin-bottom:16px;padding-left:24px') // Markdown ul/ol
    })

    it('converts single newlines to hard line breaks, like the old blade template', async () => {
      const { html } = await renderMarkdownNotice({ ...baseVariables, body: '一行目\n二行目' })

      expect(html).toContain('一行目<br> 二行目')
    })
  })

  describe('staff-auth-notice', () => {
    // The backend never sends `appURL` or `userName` for this template.
    const { appURL: _appURL, ...staffVariables } = baseVariables

    it('renders the code ticket and degrades the chrome per the backend variable contract', async () => {
      // The wordmark link, footer app-link line, and salutation must all be omitted.
      const { html, warnings } = await renderStaffAuthNotice(staffVariables)

      expect(warnings).toEqual([])
      expect(html).toContain('スタッフモード')
      expect(html).toContain(
        '<h1 style="color:#22292f;font-size:24px;font-weight:bold;letter-spacing:-0.5px;line-height:1.4;margin:0 0 14px;text-align:left">スタッフ認証</h1>'
      )
      expect(html).not.toContain(' 様')

      // Without `appURL` the wordmark still renders, but as plain text.
      expect(html).not.toContain(wordmarkLink)
      expect(html).toContain(
        '<span style="color:#22292f;font-size:18px;font-weight:700;letter-spacing:-0.2px;text-decoration:none">PortalDots<span style="color:#0a65db">.</span></span>'
      )

      // The code ticket: dotted brand border on the wash panel, the code set
      // large in the mono face with wide tracking, expiry note inside.
      expect(html).toContain(
        'background-color:#f0f5fc;border:1px dotted #7fabe9;border-radius:14px;padding:28px 16px;text-align:center'
      )
      expect(html).toContain('font-size:40px')
      expect(html).toContain('letter-spacing:12px')
      expect(html).toContain('123456')
      expect(html).toContain('有効期限は発行から5分間です')

      // Discard note behind the dotted rule.
      expect(html).toContain('border-top:1px dotted #7fabe9;margin-top:32px')
      expect(html).toContain('認証コードに覚えがない場合は、このメールを破棄してください。')

      // Shared footer, without the app-link line.
      expect(html).toContain('<span style="font-weight:600">PortalDots 実行委員会</span>')
      expect(html).not.toContain('href="https://example.com"')
      expect(html).toContain(poweredBy)
    })

    it('links the wordmark and footer app line when appURL is available', async () => {
      const { html } = await renderStaffAuthNotice({ ...baseVariables, appURL: 'https://example.com' })

      expect(html).toContain(wordmarkLink)
    })
  })
})
