import type { PreviewPropsConfig } from '@hono-email/preview'
import { Body, Head, Html, Text, render } from 'hono-email'
import {
  BodyText,
  BRAND_SOFT,
  CardHeading,
  CardShell,
  Eyebrow,
  FONT_FAMILY,
  Footer,
  Footnote,
  INK,
  MONO_FAMILY,
  MUTED,
  PAGE_BACKGROUND,
  PreviewText,
  PrimaryButton,
  WASH,
  Wordmark
} from '../components/chrome'

export interface RegistrationVerifyProps {
  adminName: string
  appName: string
  appURL: string
  contactEmail: string
  preview?: string
  subject: string
  userName?: string
  verifyURL: string
}

export const previewProps = {
  adminName: { type: 'string', default: 'PortalDots 実行委員会' },
  appName: { type: 'string', default: 'PortalDots' },
  appURL: { type: 'string', default: 'https://example.com' },
  contactEmail: { type: 'string', default: 'contact@example.com' },
  preview: { type: 'string', default: 'ユーザー登録の確認' },
  subject: { type: 'string', default: 'メール認証のお願い' },
  userName: { type: 'string', default: '山田 太郎' },
  verifyURL: { type: 'string', default: 'https://example.com/verify' }
} satisfies PreviewPropsConfig

export default function RegistrationVerify({
  adminName,
  appName,
  appURL,
  contactEmail,
  preview,
  subject,
  userName,
  verifyURL
}: RegistrationVerifyProps) {
  return (
    <Html lang="ja">
      <Head>
        <title>{subject}</title>
      </Head>
      <Body
        style={{
          backgroundColor: PAGE_BACKGROUND,
          color: INK,
          fontFamily: FONT_FAMILY,
          margin: 0,
          padding: '0 0 40px'
        }}
      >
        <PreviewText>{preview || subject}</PreviewText>
        <Wordmark appName={appName} appURL={appURL} />
        <CardShell>
          <Eyebrow>ユーザー登録</Eyebrow>
          {/* Heading is hardcoded, not the dynamic subject. */}
          <CardHeading>メール認証のお願い</CardHeading>
          {userName && <BodyText>{userName} 様</BodyText>}
          <BodyText>「{appName}」にご登録いただき、ありがとうございます。</BodyText>
          <BodyText>ユーザー登録を完了するには、以下のボタンをクリックしてください。</BodyText>
          <PrimaryButton href={verifyURL}>認証する（ログイン不要）</PrimaryButton>
          <table
            role="presentation"
            border={0}
            cellPadding="0"
            cellSpacing="0"
            width="100%"
            style={{ borderTop: `1px dotted ${BRAND_SOFT}`, marginTop: '4px' }}
          >
            <tbody>
              <tr>
                <td style={{ paddingTop: '18px' }}>
                  <Text style={{ color: MUTED, fontSize: '13px', lineHeight: '1.7', margin: '0 0 10px' }}>
                    ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください:
                  </Text>
                  <div style={{ backgroundColor: WASH, borderRadius: '10px', padding: '14px 16px' }}>
                    <Text
                      style={{
                        color: INK,
                        fontFamily: MONO_FAMILY,
                        fontSize: '12px',
                        lineHeight: '1.6',
                        margin: 0,
                        wordBreak: 'break-all'
                      }}
                    >
                      {verifyURL}
                    </Text>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <Footnote>本メールに心当たりがない場合、そのままメールを破棄してください。</Footnote>
        </CardShell>
        <Footer adminName={adminName} appName={appName} appURL={appURL} contactEmail={contactEmail} />
      </Body>
    </Html>
  )
}

export async function renderRegistrationVerify(variables: Record<string, string>) {
  return render(
    <RegistrationVerify
      adminName={variables.adminName ?? ''}
      appName={variables.appName ?? ''}
      appURL={variables.appURL ?? ''}
      contactEmail={variables.contactEmail ?? ''}
      preview={variables.preview}
      subject={variables.subject ?? ''}
      userName={variables.userName}
      verifyURL={variables.verifyURL ?? ''}
    />,
    {
      // `<LinkButton>` always sets target="_blank", which strict-mode validation
      // flags as an unsupported HTML email attribute. This is a known, accepted
      // warning (see templates.test.ts), so silence the console.warn spam this
      // would otherwise cause on every registration email the queue consumer
      // sends. `warnings` is still populated on the returned result regardless
      // of `onWarning`.
      onWarning: 'silent',
      text: {
        headingStyle: 'preserve',
        linkFormat: 'text-only'
      }
    }
  )
}
