import { createCssContext } from 'hono/css'

interface EmailPreviewProps {
  className: string
  children: string
}

export function EmailPreview({ className, children }: EmailPreviewProps) {
  return (
    <div data-hono-email-preview="true" class={className}>
      {children}
    </div>
  )
}

export async function createEmailStyles() {
  const { Style, css } = createCssContext({ id: 'hono-css' })

  const [preview, body, container, mutedText, footer, authCodeBox, authCode] = await Promise.all([
    css`
      display: none;
      max-height: 0;
      max-width: 0;
      font-size: 1px;
      line-height: 1px;
      color: #ffffff;
      mso-hide: all;
    `,
    css`
      background-color: #f6f9fc;
      color: #1f2937;
      font-family: sans-serif;
    `,
    css`
      max-width: 560px;
      margin: 0 auto;
      padding: 24px;
      background-color: #ffffff;
    `,
    css`
      font-size: 12px;
      color: #6b7280;
    `,
    css`
      margin-top: 24px;
      border-top: 1px solid #eaeaea;
      padding-top: 16px;
      font-size: 12px;
      color: #6b7280;
    `,
    css`
      margin: 24px auto;
      padding: 16px 32px;
      background-color: #f3f4f6;
      text-align: center;
    `,
    css`
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
    `
  ])

  return {
    Style,
    preview,
    body,
    container,
    mutedText,
    footer,
    authCodeBox,
    authCode
  }
}
