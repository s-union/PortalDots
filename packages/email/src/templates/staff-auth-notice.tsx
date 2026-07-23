import type { PreviewPropsConfig } from '@hono-email/preview'
import { Body, Column, Head, Html, Section, Text, render } from 'hono-email'
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
  WASH,
  Wordmark
} from '../components/chrome'

export interface StaffAuthNoticeProps {
  adminName: string
  appName: string
  // Not sent by the backend today, so the wordmark link and footer app line degrade when absent.
  appURL?: string
  authCode: string
  contactEmail: string
  preview?: string
  subject: string
  userName?: string
}

export const previewProps = {
  adminName: { type: 'string', default: 'PortalDots 実行委員会' },
  appName: { type: 'string', default: 'PortalDots' },
  appURL: { type: 'string', default: 'https://example.com' },
  authCode: { type: 'string', default: '123456' },
  contactEmail: { type: 'string', default: 'contact@example.com' },
  preview: { type: 'string', default: 'スタッフモード認証コード' },
  subject: { type: 'string', default: 'スタッフモード認証コードのお知らせ' },
  userName: { type: 'string', default: '山田 太郎' }
} satisfies PreviewPropsConfig

// The one-time code presented as a "ticket": a brand-washed panel with a
// dotted border, the code set large in the mono face with wide tracking.
// `paddingLeft` compensates the trailing letter-spacing after the last digit
// so the code sits optically centered.
function CodeTicket({ authCode }: { authCode: string }) {
  return (
    <Section style={{ margin: '28px 0' }}>
      <Column
        style={{
          backgroundColor: WASH,
          border: `1px dotted ${BRAND_SOFT}`,
          borderRadius: '14px',
          padding: '28px 16px',
          textAlign: 'center'
        }}
      >
        <Text style={{ color: MUTED, fontSize: '11px', fontWeight: 'bold', letterSpacing: '3px', margin: '0 0 12px' }}>
          認証コード
        </Text>
        <Text
          style={{
            color: INK,
            fontFamily: MONO_FAMILY,
            fontSize: '40px',
            fontWeight: 'bold',
            letterSpacing: '12px',
            lineHeight: '1.2',
            margin: '0 0 14px',
            paddingLeft: '12px'
          }}
        >
          {authCode}
        </Text>
        <Text style={{ color: MUTED, fontSize: '12px', margin: 0 }}>有効期限は発行から5分間です</Text>
      </Column>
    </Section>
  )
}

export default function StaffAuthNotice({
  adminName,
  appName,
  appURL,
  authCode,
  contactEmail,
  preview,
  subject,
  userName
}: StaffAuthNoticeProps) {
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
          <Eyebrow>スタッフモード</Eyebrow>
          {/* Heading is hardcoded, not the dynamic subject. */}
          <CardHeading>スタッフ認証</CardHeading>
          {userName && <BodyText>{userName} 様</BodyText>}
          <BodyText>
            スタッフモードにアクセスするには、以下の「認証コード」をスタッフ認証ページで入力してください。
          </BodyText>
          <CodeTicket authCode={authCode} />
          <Footnote>認証コードに覚えがない場合は、このメールを破棄してください。</Footnote>
        </CardShell>
        <Footer adminName={adminName} appName={appName} appURL={appURL} contactEmail={contactEmail} />
      </Body>
    </Html>
  )
}

export async function renderStaffAuthNotice(variables: Record<string, string>) {
  return render(
    <StaffAuthNotice
      adminName={variables.adminName ?? ''}
      appName={variables.appName ?? ''}
      appURL={variables.appURL}
      authCode={variables.authCode ?? ''}
      contactEmail={variables.contactEmail ?? ''}
      preview={variables.preview}
      subject={variables.subject ?? ''}
      userName={variables.userName}
    />,
    {
      text: {
        headingStyle: 'preserve',
        linkFormat: 'text-only'
      }
    }
  )
}
